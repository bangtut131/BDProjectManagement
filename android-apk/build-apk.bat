@echo off
set JAVA_HOME=C:\Users\LENOVO\.bubblewrap\jdk\jdk-17.0.11+9
set ANDROID_HOME=C:\Users\LENOVO\.bubblewrap\android_sdk
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d "d:\ACEP\BD PROJECT MANAGEMENT\android-apk"
echo Using JAVA_HOME: %JAVA_HOME%
java -version
echo.
echo Building APK...
call gradlew.bat assembleRelease -PkeyStorePassword=bdpm2026 -PkeyPassword=bdpm2026
echo.
echo === BUILD COMPLETE ===
if exist "app\build\outputs\apk\release\app-release-unsigned.apk" (
    echo SUCCESS! APK found at: app\build\outputs\apk\release\app-release-unsigned.apk
) else if exist "app\build\outputs\apk\release\app-release.apk" (
    echo SUCCESS! APK found at: app\build\outputs\apk\release\app-release.apk
) else (
    echo Checking outputs...
    dir /s /b "app\build\outputs\apk\" 2>nul
)
