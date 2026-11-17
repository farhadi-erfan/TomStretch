; Extra steps for the Windows installer and uninstaller (electron-builder NSIS).
; The app was called "Desk Pet" before 0.2.0; those names are handled too.

; Before installing or updating: stop a running copy, whichever version.
!macro customInit
  nsExec::Exec 'taskkill /F /T /IM "TomStretch.exe"'
  nsExec::Exec 'taskkill /F /T /IM "Desk Pet.exe"'
!macroend

!macro customInstall
  ; Start menu: an "Uninstall TomStretch" entry next to the app.
  CreateShortCut "$SMPROGRAMS\Uninstall TomStretch.lnk" "$INSTDIR\Uninstall TomStretch.exe"
  ; Replace an old "Desk Pet" install: its program files and shortcuts go;
  ; its settings stay in %APPDATA%\Desk Pet and the app copies them over.
  StrCmp "$INSTDIR" "$LOCALAPPDATA\Programs\Desk Pet" +2
    RMDir /r "$LOCALAPPDATA\Programs\Desk Pet"
  Delete "$SMPROGRAMS\Desk Pet.lnk"
  Delete "$SMPROGRAMS\Uninstall Desk Pet.lnk"
  Delete "$DESKTOP\Desk Pet.lnk"
!macroend

; Uninstall removes everything: the running app, its shortcuts, its settings,
; logs and caches, under both names.
!macro customUnInstall
  nsExec::Exec 'taskkill /F /T /IM "TomStretch.exe"'
  nsExec::Exec 'taskkill /F /T /IM "Desk Pet.exe"'
  Sleep 500
  Delete "$SMPROGRAMS\Uninstall TomStretch.lnk"
  Delete "$SMPROGRAMS\TomStretch.lnk"
  Delete "$DESKTOP\TomStretch.lnk"
  Delete "$SMPROGRAMS\Uninstall Desk Pet.lnk"
  Delete "$SMPROGRAMS\Desk Pet.lnk"
  Delete "$DESKTOP\Desk Pet.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "TomStretch"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Desk Pet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "app.deskpet.desktop"
  ; An update also runs the old uninstaller: keep settings then.
  ${ifNot} ${isUpdated}
    SetShellVarContext current
    RMDir /r "$APPDATA\TomStretch"
    RMDir /r "$APPDATA\tomstretch"
    RMDir /r "$APPDATA\Desk Pet"
    RMDir /r "$APPDATA\desk-pet"
    RMDir /r "$LOCALAPPDATA\tomstretch-updater"
    RMDir /r "$LOCALAPPDATA\desk-pet-updater"
    RMDir /r "$LOCALAPPDATA\TomStretch"
    RMDir /r "$LOCALAPPDATA\Desk Pet"
    RMDir /r "$LOCALAPPDATA\Programs\Desk Pet"
  ${endIf}
!macroend
