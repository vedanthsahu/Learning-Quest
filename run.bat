@echo off
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
    python server.py
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        py -3 server.py
    ) else (
        echo Python was not found on this PC. Install Python 3 from https://python.org/downloads
        echo ^(no other software is needed -- Learning Quest only needs Python to run^)
        pause
    )
)
