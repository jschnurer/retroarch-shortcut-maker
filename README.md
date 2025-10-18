# RetroArch Shortcut Maker
This is a small utility that lets you quickly create shortcuts to launch ROMs with RetroArch.

# Requirements/Installation
1. Windows (uses Powershell to create Windows shortcuts)
1. Install NodeJS
1. Install dependencies
    1. Run `npm install` in the project folder.

# Setup / Configuration
The utility needs to know 2 key pieces of information, which will be remembered in `.retroarch-shortcut-maker.json` alongside the app in its folder:
1. Your RetroArch folder location
1. Your "Desktop" location (shortcut destination)

These two settings are configured once and then remembered by the app.

## Configuration File
The two settings are saved in `.retroarch-shortcut-maker.json` alongside the `index.js` file in the same folder. This config file can be created manually or by calling integrated commands to set the values.

Example:
```json
{
  "retroarchFolder": "C:\\Users\\YourName\\Documents\\Games\\Emulators\\Retroarch",
  "desktopFolder": "C:\\Users\\YourName\\Desktop"
}
```

### Configure RetroArch folder location
Run the app with the `set-ra-folder` (or `srf`) command, specifying your folder location.

Example: `node . srf "C:\Users\YourName\Documents\Games\RetroArch"`

### Configure Desktop folder location
Run the app with the `set-desktop-folder` (or `sdf`) command, specifying your folder location.

Example: `node . sdf "C:\Users\YourName\Desktop"`

# Creating a ROM Shortcut
After configuring the options (as above), ROM shortcuts are ready to be made. Run the app with the `make-shortcut` (or `m` or `s`) command, specifying your ROM's full path.

Example: `node . m "C:\Users\YourName\Documents\Games\ROMs\MAME\s1945.zip"`

You will be presented with a paginated list of cores that exist within your RetroArch folder's "./cores" subfolder. Choose the core the shortcut should use by entering its number and pressing `Enter` or navigate through the pages by entering `n` for next page and `p` for previous page (then press `Enter`).

Example:
```
Cores (page 1/2):
  1) blastem_libretro.dll                         11) mame2003_midway_libretro.dll
  2) bluemsx_libretro.dll                         12) mame2003_plus_libretro.dll
  3) bsnes_hd_beta_libretro.dll                   13) mame2010_libretro.dll
  4) bsnes_libretro.dll                           14) mame_libretro.dll
  5) fbneo_libretro.dll                           15) mednafen_pce_libretro.dll
  6) flycast_libretro.dll                         16) mednafen_psx_hw_libretro.dll
  7) gambatte_libretro.dll                        17) mednafen_saturn_libretro.dll
  8) genesis_plus_gx_libretro.dll                 18) mednafen_vb_libretro.dll
  9) mame2000_libretro.dll                        19) mesen_libretro.dll
  10) mame2003_libretro.dll                       20) mgba_libretro.dll
Choose 1-20 or [n]ext/[c]ancel:
```

After choosing the appropriate core for your ROM, you will be asked if you'd like the **core name** to be included in the shortcut's name. Enter `y` or `n` and press `Enter`.

Example:
```
Rom: s1945
Core: fbneo_libretro

(Note: You can skip this question by passing -i to include core name or -o to omit it.)
Include core name in shortcut? (y/n):
```

You can optionally skip this question by including either of the following flags (but not both):
* `-omit-core` (or `-o`): Automatically omits the core name from the outputted shortcut
* `-include-core` (or `-i`): Automatically includes the core name from the outputted shortcut

## Drag-and-Drop Shortcut Creation
Alternatively, shortcuts can be created by drag/dropping a ROM file directly onto either of the two batch files (*.bat) included alongside the app:
* `./make-ra-shortcut-include-core.bat` (includes core name in output shortcut)
* `./make-ra-shortcut-omit-core.bat` (omits core name in output shortcut)

Dropping a ROM file onto either of these will open a terminal and ask you which core to use. After selecting a core, a shortcut will be created and the terminal will close.