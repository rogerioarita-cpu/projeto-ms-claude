$utf8 = New-Object System.Text.UTF8Encoding($false)

Get-ChildItem .\src -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.css,*.md,*.sql,*.scss | ForEach-Object {
    $path = $_.FullName
    $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $original = $text

    $text = $text.Replace("Ã¡", "á").Replace("Ã©", "é").Replace("Ã­", "í").Replace("Ã³", "ó").Replace("Ãº", "ú")
    $text = $text.Replace("Ã£", "ã").Replace("Ãµ", "õ").Replace("Ã¢", "â").Replace("Ãª", "ê").Replace("Ã´", "ô").Replace("Ã§", "ç")

    if ($text -ne $original) {
        [System.IO.File]::WriteAllText($path, $text, $utf8)
        Write-Host "Corrigido: $path"
    }
}