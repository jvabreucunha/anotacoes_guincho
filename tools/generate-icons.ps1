# Gera icons/icon-192.png e icons/icon-512.png compondo a logo real
# (images/logo-jbatista-completo.png) sobre um fundo navy solido.
# Uso: powershell -File tools/generate-icons.ps1

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root "images\logo-jbatista-completo.png"
$outDir = Join-Path $root "icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$navy = [System.Drawing.Color]::FromArgb(255, 10, 24, 48) # #0a1830 (--navy-900)

function New-Icon($size, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $g.Clear($navy)

    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $targetH = [int]($size * 0.62)
    $targetW = [int]($targetH * ($logo.Width / $logo.Height))
    $x = [int](($size - $targetW) / 2)
    $y = [int](($size - $targetH) / 2)
    $g.DrawImage($logo, $x, $y, $targetW, $targetH)
    $logo.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Gerado $outPath"
}

New-Icon 192 (Join-Path $outDir "icon-192.png")
New-Icon 512 (Join-Path $outDir "icon-512.png")
