Add-Type -AssemblyName System.Drawing

$sourcePath = 'C:\Users\Tier-3\.codex\generated_images\01a05bcb-320c-7dd3-9cc0-980cc3ba5a9c\exec-9134cc3c-730e-402d-9339-398860119f1a.png'
$outputDir = Join-Path $PSScriptRoot '..\output'
$outputPath = Join-Path $outputDir 'linkedin-banner-people-decisions-right.png'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$canvas = New-Object System.Drawing.Bitmap 1584, 396
$canvas.SetResolution(96, 96)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

$background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 1584, 396),
    ([System.Drawing.ColorTranslator]::FromHtml('#25301F')),
    ([System.Drawing.ColorTranslator]::FromHtml('#0E1814'))
)
$graphics.FillRectangle($background, 0, 0, 1584, 396)

$warmGlow = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point 720, 0),
    ([System.Drawing.Color]::FromArgb(110, 78, 45, 22)),
    ([System.Drawing.Color]::FromArgb(0, 20, 32, 26))
)
$graphics.FillRectangle($warmGlow, 0, 0, 720, 396)

$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(17, 243, 237, 226)), 1
for ($x = 0; $x -lt 1584; $x += 48) { $graphics.DrawLine($gridPen, $x, 0, $x, 396) }
for ($y = 12; $y -lt 396; $y += 48) { $graphics.DrawLine($gridPen, 0, $y, 1584, $y) }

$portrait = [System.Drawing.Image]::FromFile($sourcePath)
$destRect = New-Object System.Drawing.Rectangle 1114, 0, 470, 396
$sourceRect = New-Object System.Drawing.Rectangle 0, 20, 650, 548
$graphics.DrawImage($portrait, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)

$portraitFade = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 1060, 0),
    (New-Object System.Drawing.Point 1230, 0),
    ([System.Drawing.Color]::FromArgb(255, 20, 32, 26)),
    ([System.Drawing.Color]::FromArgb(0, 20, 32, 26))
)
$graphics.FillRectangle($portraitFade, 1060, 0, 180, 396)

$cream = [System.Drawing.ColorTranslator]::FromHtml('#F6E8CB')
$softCream = [System.Drawing.ColorTranslator]::FromHtml('#F3EDE2')
$terracotta = [System.Drawing.ColorTranslator]::FromHtml('#C7674F')
$mutedCream = [System.Drawing.Color]::FromArgb(220, 243, 237, 226)

$headlineFont = New-Object System.Drawing.Font 'Arial', 45, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$taglineFont = New-Object System.Drawing.Font 'Arial', 22, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$buttonFont = New-Object System.Drawing.Font 'Arial', 18, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$proofFont = New-Object System.Drawing.Font 'Arial', 17, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)

$headlineBrush = New-Object System.Drawing.SolidBrush $cream
$taglineBrush = New-Object System.Drawing.SolidBrush $softCream
$proofBrush = New-Object System.Drawing.SolidBrush $mutedCream
$buttonBrush = New-Object System.Drawing.SolidBrush $terracotta
$buttonTextBrush = New-Object System.Drawing.SolidBrush $softCream

$graphics.DrawString('People decisions are', $headlineFont, $headlineBrush, 430, 72)
$graphics.DrawString('business decisions.', $headlineFont, $headlineBrush, 430, 124)
$graphics.DrawString('Practical people systems before growth gets expensive', $taglineFont, $taglineBrush, 433, 198)

$buttonRect = New-Object System.Drawing.Rectangle 433, 252, 142, 48
$buttonPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$radius = 12
$buttonPath.AddArc($buttonRect.X, $buttonRect.Y, $radius, $radius, 180, 90)
$buttonPath.AddArc($buttonRect.Right - $radius, $buttonRect.Y, $radius, $radius, 270, 90)
$buttonPath.AddArc($buttonRect.Right - $radius, $buttonRect.Bottom - $radius, $radius, $radius, 0, 90)
$buttonPath.AddArc($buttonRect.X, $buttonRect.Bottom - $radius, $radius, $radius, 90, 90)
$buttonPath.CloseFigure()
$graphics.FillPath($buttonBrush, $buttonPath)
$buttonTextFormat = New-Object System.Drawing.StringFormat
$buttonTextFormat.Alignment = [System.Drawing.StringAlignment]::Center
$buttonTextFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$buttonTextRect = New-Object System.Drawing.RectangleF 433, 252, 142, 48
$graphics.DrawString('DM AUDIT', $buttonFont, $buttonTextBrush, $buttonTextRect, $buttonTextFormat)
$graphics.DrawString('Built people functions across 4 startups', $proofFont, $proofBrush, 607, 266)

$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$buttonTextFormat.Dispose()
$buttonPath.Dispose()
$buttonTextBrush.Dispose()
$buttonBrush.Dispose()
$proofBrush.Dispose()
$taglineBrush.Dispose()
$headlineBrush.Dispose()
$proofFont.Dispose()
$buttonFont.Dispose()
$taglineFont.Dispose()
$headlineFont.Dispose()
$portraitFade.Dispose()
$portrait.Dispose()
$gridPen.Dispose()
$warmGlow.Dispose()
$background.Dispose()
$graphics.Dispose()
$canvas.Dispose()

Write-Output $outputPath
