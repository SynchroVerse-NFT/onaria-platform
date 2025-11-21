# PowerShell script to remove console.log/debug/info/warn/error statements

$files = Get-ChildItem -Path "src","worker" -Recurse -Include *.ts,*.tsx -Exclude *.test.ts,*.test.tsx,*.test.tsx

$totalRemoved = 0
$filesModified = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content

    # Remove console.log, console.debug, console.info statements (complete lines)
    $content = $content -replace '^\s*console\.(log|debug|info)\([^)]*\);\s*$', ''

    # Remove console.warn and console.error but keep the catch blocks clean
    # Pattern 1: } catch (error) { console.error(...); other_code }
    $content = $content -replace '(\} catch \(error\)) \{\s*console\.(warn|error)\([^)]*\);', '$1 {'

    # Pattern 2: } catch (error) { console.error(...); }  -> } catch {
    $content = $content -replace '\} catch \([^)]*\) \{\s*console\.(warn|error)\([^)]*\);\s*\}', '} catch { }'

    # Pattern 3: Standalone console.error/warn in catch blocks
    $content = $content -replace '\s*console\.(error|warn)\([^)]*\);\s*\n', "`n"

    if ($content -ne $originalContent) {
        $changes = ($originalContent.Length - $content.Length)
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalRemoved++
        $filesModified += $file.FullName
        Write-Host "Modified: $($file.FullName) (removed ~$changes chars)"
    }
}

Write-Host "`n===== CLEANUP SUMMARY ====="
Write-Host "Files modified: $totalRemoved"
Write-Host "Files list:"
$filesModified | ForEach-Object { Write-Host "  $_" }
