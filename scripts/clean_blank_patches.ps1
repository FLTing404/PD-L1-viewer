param(
  [string]$DataRoot = "D:\study\lab\26chinavis\code\data",
  [switch]$Delete
)

# Identify blank patches via patches_manifest.csv (num_cells == 0).
# For each case:
#   * find blank rows
#   * print summary (blank/real)
#   * if -Delete:
#       - remove blank patch folders under patches/
#       - rewrite patches_manifest.csv without those rows (keeps real ones intact)

$globalSummary = New-Object System.Collections.Generic.List[psobject]
$cases = Get-ChildItem $DataRoot -Directory

foreach ($caseDir in $cases) {
  $csvPath = Join-Path $caseDir.FullName 'patches_manifest.csv'
  if (-not (Test-Path $csvPath)) { continue }

  $rows = Import-Csv -LiteralPath $csvPath
  if ($rows.Count -eq 0) { continue }

  $blankRows = $rows | Where-Object { ([int]$_.num_cells) -le 0 }
  $realRows  = $rows | Where-Object { ([int]$_.num_cells) -gt 0 }

  $globalSummary.Add([pscustomobject]@{
    Case  = $caseDir.Name
    Blank = $blankRows.Count
    Real  = $realRows.Count
    Total = $rows.Count
  }) | Out-Null

  if ($Delete -and $blankRows.Count -gt 0) {
    $patchesDir = Join-Path $caseDir.FullName 'patches'
    foreach ($row in $blankRows) {
      $patchDir = Join-Path $patchesDir $row.patch_id
      if (Test-Path -LiteralPath $patchDir) {
        Remove-Item -LiteralPath $patchDir -Recurse -Force -ErrorAction SilentlyContinue
      }
    }
    # Rewrite manifest without blank rows; preserve header order from the original.
    $backupPath = $csvPath + '.bak'
    if (-not (Test-Path -LiteralPath $backupPath)) {
      Copy-Item -LiteralPath $csvPath -Destination $backupPath -Force
    }
    $realRows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8
    Write-Host ("[{0}] removed {1} blank folders, kept {2} real rows" -f $caseDir.Name, $blankRows.Count, $realRows.Count)
  }
}

$globalSummary | Sort-Object -Property Blank -Descending | Format-Table -AutoSize
