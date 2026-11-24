$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$taskName = 'LGTrading Picking WhatsApp'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { throw 'Task already exists. Review before replacing.' }
if (-not (Test-Path (Join-Path $root 'worker.key'))) { throw 'Missing worker key' }
if (-not (Test-Path (Join-Path $root 'config.json'))) { throw 'Missing configuration' }
New-Item -ItemType Directory -Path (Join-Path $root 'data') -Force | Out-Null
# Only this new directory is changed. Existing agents, VMs and firewall stay untouched.
icacls.exe $root /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-19:(OI)(CI)RX' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot protect application directory' }
icacls.exe (Join-Path $root 'data') /grant:r '*S-1-5-19:(OI)(CI)M' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot grant data access' }
if (-not (Test-Path (Join-Path $root 'PickingWhatsApp.exe'))) {
  Add-Type -TypeDefinition (Get-Content (Join-Path $root 'launcher.cs') -Raw) -OutputAssembly (Join-Path $root 'PickingWhatsApp.exe') -OutputType ConsoleApplication
}
$action = New-ScheduledTaskAction -Execute (Join-Path $root 'PickingWhatsApp.exe') -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -AtStartup
$watchdog = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId 'S-1-5-19' -LogonType ServiceAccount -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($trigger,$watchdog) -Principal $principal -Settings $settings -Description 'Picking WhatsApp: isolated LocalService, 10 percent CPU, 1536 MB total job memory; no Forex/Wazuh dependency.' | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Output 'Picking WhatsApp installed; outbound notices remain disabled until paired and tested.'
