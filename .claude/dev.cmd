@echo off
cd /d "C:\Users\Admin\Documents\GitHub\LifePanel"
set "PATH=C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.16.0-win-x64;%PATH%"
node node_modules\next\dist\bin\next dev --port 3000
