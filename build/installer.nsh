; Extra steps for the Windows installer and uninstaller (electron-builder NSIS).

; Before installing or updating: stop a running Desk Pet, whichever version.
!macro customInit
  nsExec::Exec 'taskkill /F /T /IM "Desk Pet.exe"'
!macroend

; Start menu: an "Uninstall Desk Pet" entry next to the app.
!macro customInstall
  CreateShortCut "$SMPROGRAMS\Uninstall Desk Pet.lnk" "$INSTDIR\Uninstall Desk Pet.exe"
!macroend

; Uninstall removes everything: the running app, its shortcuts, its settings,
; logs and caches (%APPDATA%\Desk Pet), and any updater leftovers.
!macro customUnInstall
  nsExec::Exec 'taskkill /F /T /IM "Desk Pet.exe"'
  Sleep 500
  Delete "$SMPROGRAMS\Uninstall Desk Pet.lnk"
  Delete "$DESKTOP\Desk Pet.lnk"
  Delete "$SMPROGRAMS\Desk Pet.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Desk Pet"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "app.deskpet.desktop"
  ; An update also runs the old uninstaller: keep settings then.
  ${ifNot} ${isUpdated}
    SetShellVarContext current
    RMDir /r "$APPDATA\Desk Pet"
    RMDir /r "$APPDATA\desk-pet"
    RMDir /r "$LOCALAPPDATA\desk-pet-updater"
    RMDir /r "$LOCALAPPDATA\Desk Pet"
  ${endIf}
!macroend
