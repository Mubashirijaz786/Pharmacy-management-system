Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting Pharmacy ERP .NET 8 Backend API..." -ForegroundColor Green
Write-Host "Connecting to Supabase Cloud Database..." -ForegroundColor Yellow
Write-Host "====================================================" -ForegroundColor Cyan

& "C:\Program Files\dotnet\dotnet.exe" run --project server/Pharmacy.Backend/Pharmacy.API
