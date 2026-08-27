# SensaSport — petit serveur de fichiers statiques.
#
#   .\serve.ps1              -> http://127.0.0.1:8123 (cet ordinateur seulement)
#   .\serve.ps1 -Lan         -> accessible depuis ton téléphone sur le même Wi-Fi
#   .\serve.ps1 -Port 9000   -> autre port
#
# Utilise un socket TCP brut : aucune permission administrateur nécessaire.
# Ctrl+C pour arrêter.

param(
  [int]$Port = 8123,
  [switch]$Lan
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

$types = @{
  '.html'        = 'text/html; charset=utf-8'
  '.css'         = 'text/css; charset=utf-8'
  '.js'          = 'text/javascript; charset=utf-8'
  '.json'        = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.ico'         = 'image/x-icon'
  '.md'          = 'text/markdown; charset=utf-8'
}

$bindAddress = if ($Lan) { [System.Net.IPAddress]::Any } else { [System.Net.IPAddress]::Loopback }
$listener = New-Object System.Net.Sockets.TcpListener($bindAddress, $Port)
$listener.Start()

Write-Host ""
Write-Host "  SensaSport est servi depuis $root" -ForegroundColor Green
Write-Host "  -> http://127.0.0.1:$Port" -ForegroundColor Green
if ($Lan) {
  $ips = Get-NetIPAddress -AddressFamily IPv4 |
         Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }
  foreach ($ip in $ips) { Write-Host "  -> http://$($ip.IPAddress):$Port  (depuis ton téléphone)" -ForegroundColor Green }
}
Write-Host "  Ctrl+C pour arrêter." -ForegroundColor DarkGray
Write-Host ""

function Send-Response {
  param($stream, [int]$code, [string]$status, [string]$contentType, [byte[]]$body)
  $head = "HTTP/1.1 $code $status`r`n" +
          "Content-Type: $contentType`r`n" +
          "Content-Length: $($body.Length)`r`n" +
          "Cache-Control: no-cache`r`n" +
          "Connection: close`r`n`r`n"
  $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
  $stream.Write($headBytes, 0, $headBytes.Length)
  if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
  $stream.Flush()
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      # Les navigateurs ouvrent des connexions spéculatives qui n'envoient
      # jamais rien : sans délai d'expiration, elles figeraient la boucle.
      $client.ReceiveTimeout = 2000
      $client.SendTimeout = 5000
      $client.NoDelay = $true

      $stream = $client.GetStream()
      $stream.ReadTimeout = 2000
      $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
      $requestLine = $reader.ReadLine()
      if (-not $requestLine) { $client.Close(); continue }

      $parts = $requestLine -split ' '
      $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
      $path = ($rawPath -split '\?')[0]
      $path = [System.Uri]::UnescapeDataString($path)
      if ($path -eq '/') { $path = '/index.html' }

      # Empêche toute sortie du dossier du projet.
      $relative = $path.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

      if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or
          -not (Test-Path $full -PathType Leaf)) {
        $body = [System.Text.Encoding]::UTF8.GetBytes('404')
        Send-Response $stream 404 'Not Found' 'text/plain; charset=utf-8' $body
        Write-Host "  404 $path" -ForegroundColor DarkYellow
      }
      else {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $body = [System.IO.File]::ReadAllBytes($full)
        Send-Response $stream 200 'OK' $ct $body
        Write-Host "  200 $path" -ForegroundColor DarkGray
      }
    }
    catch [System.IO.IOException] { }   # connexion spéculative expirée : normal
    catch { Write-Host "  erreur: $($_.Exception.Message)" -ForegroundColor DarkYellow }
    finally {
      # Fermeture propre : sans le FIN explicite, certaines requêtes
      # (dont le script du service worker) voient la connexion coupée net.
      try { $client.Client.Shutdown([System.Net.Sockets.SocketShutdown]::Send) } catch { }
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
  Write-Host "  Serveur arrêté." -ForegroundColor DarkGray
}
