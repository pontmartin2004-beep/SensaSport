# SensaSport — compile les sources en une page unique autonome.
#
#   .\build.ps1
#
# Produit dist\sensasport.html : tout le CSS et tout le JS en ligne, aucune
# ressource externe. C'est ce fichier qui est publié comme lien partageable.
# Les sources dans js\ et css\ restent la référence — on modifie là, puis on
# relance ce script.

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Même ordre de chargement que index.html : les dépendances d'abord.
$scripts = @(
  'js/config.js', 'js/util.js', 'js/store.js', 'js/progression.js',
  'js/anim.js', 'js/ui.js', 'js/calendar.js', 'js/onboarding.js',
  'js/home.js', 'js/session.js', 'js/bonus.js', 'js/checkin.js', 'js/history.js',
  'js/profile.js', 'js/app.js'
)

function Read-Utf8($relative) {
  $path = Join-Path $root $relative
  if (-not (Test-Path $path)) { throw "Fichier introuvable : $relative" }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

$sb = New-Object System.Text.StringBuilder

# Le titre doit rester en tête : c'est lui qui nomme la page.
[void]$sb.AppendLine('<title>SensaSport</title>')
[void]$sb.AppendLine('<meta name="theme-color" content="#2E7D5B">')
[void]$sb.AppendLine('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
[void]$sb.AppendLine()
[void]$sb.AppendLine('<style>')
[void]$sb.AppendLine((Read-Utf8 'css/app.css'))
[void]$sb.AppendLine('</style>')
[void]$sb.AppendLine()
[void]$sb.AppendLine('<div id="app">')
[void]$sb.AppendLine('  <main id="screen"></main>')
[void]$sb.AppendLine('  <nav id="tabbar" class="tabbar" aria-label="Navigation principale"></nav>')
[void]$sb.AppendLine('</div>')
[void]$sb.AppendLine()
[void]$sb.AppendLine('<script>window.SENSASPORT_SINGLE_FILE = true;<' + '/script>')

foreach ($s in $scripts) {
  $code = Read-Utf8 $s
  if ($code -match '<\s*/\s*script') {
    throw "$s contient une balise de fermeture de script : l'inlining casserait la page."
  }
  [void]$sb.AppendLine()
  [void]$sb.AppendLine("<!-- $s -->")
  [void]$sb.AppendLine('<script>')
  [void]$sb.AppendLine($code)
  [void]$sb.AppendLine('<' + '/script>')
}

$distDir = Join-Path $root 'dist'
if (-not (Test-Path $distDir)) { New-Item -ItemType Directory -Path $distDir | Out-Null }

$out = Join-Path $distDir 'sensasport.html'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($out, $sb.ToString(), $utf8NoBom)

$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host ""
Write-Host "  dist\sensasport.html ecrit — $size Ko, $($scripts.Count) scripts en ligne" -ForegroundColor Green
Write-Host ""
