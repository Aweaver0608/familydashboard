@echo off
echo Syncing Family Dashboard files...
robocopy "G:\My Drive\App Development\Family Dashboard" "C:\Family Dashboard" /MIR /XF "sync_dashboard.bat"
echo Sync complete.