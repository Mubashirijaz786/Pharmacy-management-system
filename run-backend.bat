@echo off
echo ====================================================
echo Starting Pharmacy ERP .NET 8 Backend API...
echo ====================================================
taskkill /F /IM Pharmacy.API.exe /T >nul 2>&1
cd server\Pharmacy.Backend\Pharmacy.API
"C:\Program Files\dotnet\dotnet.exe" run

