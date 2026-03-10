@echo off
title BD Project Management
echo ===================================================
echo   BD PROJECT MANAGEMENT - DEV SERVER
echo ===================================================
echo.
echo Sedang menyiapkan aplikasi...
echo.

REM Cek apakah node_modules ada, jika tidak install dulu
if not exist "node_modules" (
    echo Node modules tidak ditemukan. Menginstall dependencies...
    call npm install
)

echo Memulai server... browser akan terbuka otomatis jika dikonfigurasi.
echo Tekan Ctrl+C untuk mematikan server.
echo.
call npm run dev -- --open
pause
