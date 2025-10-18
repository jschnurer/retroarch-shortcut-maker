import fs from "fs";
import os from "os";
import path from "path";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import readline from "readline";
import child_process from "child_process";

const configPath = './.retroarch-shortcut-maker.json';

function saveConfig(obj) {
  fs.writeFileSync(configPath, JSON.stringify(obj, null, 2), 'utf8');
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

yargs(hideBin(process.argv))
  .scriptName('retroarch-shortcut-maker')
  .usage('$0 <command> [options]')
  .command(
    ['set-ra-folder <folder>', 'srf <folder>'],
    'Set path to RetroArch installation folder',
    (y) => {
      y.positional('folder', {
        describe: 'Path to RetroArch folder',
        type: 'string',
      });
    },
    (argv) => {
      const cfg = loadConfig();
      cfg.retroarchFolder = path.resolve(argv.folder);

      if (!fs.existsSync(cfg.retroarchFolder)) {
        console.error('Error: Specified folder does not exist.');
        process.exit(1);
      }

      try {
        const stat = fs.statSync(cfg.retroarchFolder);
        if (!stat.isDirectory()) {
          console.error('Error: Specified path is not a directory.');
          process.exit(1);
        }
      } catch (err) {
        console.error('Error: Unable to access specified folder.');
        process.exit(1);
      }

      saveConfig(cfg);
      console.log(`Saved RetroArch folder: ${cfg.retroarchFolder}`);
    }
  )
  .command(
    ['set-desktop <folder>', 'sd <folder>'],
    'Set path to Desktop folder',
    (y) => {
      y.positional('folder', {
        describe: 'Path to Desktop folder',
        type: 'string',
      });
    },
    (argv) => {
      const cfg = loadConfig();
      cfg.desktopFolder = path.resolve(argv.folder);

      if (!fs.existsSync(cfg.desktopFolder)) {
        console.error('Error: Specified folder does not exist.');
        process.exit(1);
      }

      try {
        const stat = fs.statSync(cfg.desktopFolder);
        if (!stat.isDirectory()) {
          console.error('Error: Specified path is not a directory.');
          process.exit(1);
        }
      } catch (err) {
        console.error('Error: Unable to access specified folder.');
        process.exit(1);
      }

      saveConfig(cfg);
      console.log(`Saved Desktop folder: ${cfg.desktopFolder}`);
    }
  )
  .command(
    ['make-shortcut [rom]', 'make [rom]', 'm [rom]', 's [rom]'],
    'Create a shortcut for a ROM',
    (y) => {
      y.positional('rom', {
        describe: 'Path to ROM file (optional)',
        type: 'string',
      });
      y.option('omit-core', {
        alias: 'o',
        type: 'boolean',
        describe: 'Omit the core name in the created shortcut',
        default: false,
      });
      y.option('include-core', {
        alias: 'i',
        type: 'boolean',
        describe: 'Include the core name in the created shortcut',
        default: false,
      });
    },
    (argv) => {
      const cfg = loadConfig();
      const ra = cfg.retroarchFolder || '(not set)';

      const omitCore = argv.o || argv["omit-core"] || false;
      const includeCore = argv.i || argv["include-core"] || false;

      if (ra === '(not set)') {
        console.error('Error: RetroArch folder is not set. Use the set-ra-folder command first.');
        process.exit(1);
      }

      const desktop = cfg.desktopFolder || '(not set)';

      if (desktop === '(not set)') {
        console.error('Error: Desktop folder is not set. Use the set-desktop command first.');
        process.exit(1);
      }

      const rom = argv.rom ? path.resolve(argv.rom) : '(none)';

      // Ensure rom was provided.
      if (argv.rom === "(none)") {
        console.error('Error: No rom path specified.');
        process.exit(1);
      }

      // Ensure the rom file exists.
      if (!fs.existsSync(argv.rom)) {
        console.error('Error: Specified rom path does not exist.');
        process.exit(1);
      }

      try {
        const stat = fs.statSync(argv.rom);
        if (stat.isDirectory()) {
          console.error('Error: Specified path is not a file.');
          process.exit(1);
        }
      } catch (err) {
        console.error('Error: Unable to access specified file.');
        process.exit(1);
      }

      (async () => {
        try {
          await askForCoreAndMakeShortcut(ra, desktop, rom, omitCore, includeCore);
        } catch (err) {
          console.error('Error:', err && (err.message || err));
          process.exit(1);
        }
      })();
    }
  )
  .demandCommand(1, 'You must provide a command: set-ra-folder/srf or make-shortcut/make/m/s')
  .help()
  .strict()
  .parse();

function getCoresList(folder) {
  try {
    const coresDir = path.join(folder, 'cores');

    if (!fs.existsSync(coresDir)) {
      console.error('Error: cores directory not found inside RetroArch folder.');
      process.exit(1);
    }

    const dirents = fs.readdirSync(coresDir, { withFileTypes: true });
    const coreFiles = dirents
      .filter((d) => d.isFile())
      .map((d) => d.name);

    if (coreFiles.length === 0) {
      console.error('Error: No core files found in cores directory.');
      process.exit(1);
    }

    return coreFiles;
  } catch (err) {
    console.error('Error: Unable to scan cores directory.', err.message);
    process.exit(1);
  }
}

async function chooseCore(availableCores) {
  if (!Array.isArray(availableCores) || availableCores.length === 0) return null;

  const pageSize = 20;
  const totalPages = Math.ceil(availableCores.length / pageSize);
  let page = 0;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, (ans) => resolve(ans)));

  try {
    while (true) {
      console.clear();
      const start = page * pageSize;
      const end = Math.min(start + pageSize, availableCores.length);
      console.log(`\nCores (page ${page + 1}/${totalPages}):`);

      const numRows = Math.floor((end - start) / 2);

      // display items in two columns over numRows lines
      for (let row = 0; row < numRows; row++) {
        const leftIdx = start + row;
        if (leftIdx >= end) break;

        const leftNum = leftIdx - start + 1;
        const leftText = `${leftNum}) ${availableCores[leftIdx]}`;

        const rightIdx = leftIdx + 10;
        let rightText = '';
        if (rightIdx < end) {
          const rightNum = rightIdx - start + 1;
          rightText = `${rightNum}) ${availableCores[rightIdx]}`;
        }

        // adjust padding width as needed for alignment
        console.log('  ' + leftText.padEnd(48) + (rightText || ''));
      }

      const opts = [];
      if (page > 0) opts.push('[p]revious');
      if (page < totalPages - 1) opts.push('[n]ext');
      opts.push('[c]ancel');
      const prompt = `Choose 1-${end - start} or ${opts.join('/')}: `;

      const ans = (await question(prompt)).trim().toLowerCase();

      if (ans === 'c' || ans === 'cancel' || ans === 'q' || ans === 'quit' || ans === '') {
        return null;
      }

      if ((ans === 'n' || ans === 'next') && page < totalPages - 1) {
        page++;
        continue;
      }

      if ((ans === 'p' || ans === 'previous' || ans === 'prev') && page > 0) {
        page--;
        continue;
      }

      const num = parseInt(ans, 10);
      if (!Number.isNaN(num) && num >= 1 && num <= end - start) {
        return availableCores[start + num - 1];
      }

      console.log('Invalid selection, try again.');
    }
  } finally {
    rl.close();
  }
}

function createShortcutFile(outputPath, shortcutTarget) {
  try {

    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Parse shortcutTarget into executable path and arguments
    let exe = shortcutTarget.trim();
    let args = '';
    if (exe.startsWith('"')) {
      const endQuote = exe.indexOf('"', 1);
      if (endQuote !== -1) {
        exe = exe.slice(1, endQuote);
        args = shortcutTarget.slice(endQuote + 1).trim();
      } else {
        // malformed quoted string; treat entire thing as exe
        exe = exe.slice(1);
        args = '';
      }
    } else {
      const firstSpace = exe.indexOf(' ');
      if (firstSpace === -1) {
        args = '';
      } else {
        args = shortcutTarget.slice(firstSpace + 1).trim();
        exe = shortcutTarget.slice(0, firstSpace);
      }
    }

    // Quote for PowerShell single-quoted string (escape single quotes by doubling)
    const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;
    const workingDir = path.dirname(exe) || process.cwd();

    // PowerShell command to create the .lnk via WScript.Shell COM object
    const psCmd = [
      `(New-Object -ComObject WScript.Shell).CreateShortcut(${psQuote(outputPath)})`,
      `| ForEach-Object { $_.TargetPath = ${psQuote(exe)};`,
      args ? ` $_.Arguments = ${psQuote(args)};` : '',
      ` $_.WorkingDirectory = ${psQuote(workingDir)}; $_.Save() }`
    ].join(' ');

    child_process.execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
      stdio: 'ignore',
    });

    console.log(`Created shortcut: ${outputPath}`);
  } catch (err) {
    console.error('Error: unable to create shortcut.', err.message || err);
    process.exit(1);
  }
}

async function askForCoreAndMakeShortcut(raFolder, desktopPath, rom, omitCore, includeCore) {
  // Ask for which core to use.
  const core = await chooseCore(getCoresList(raFolder));
  if (!core) {
    console.error('Operation cancelled by user.');
    process.exit(1);
  }

  const coreName = path.basename(core, path.extname(core));
  const romBaseName = path.basename(rom, path.extname(rom));

  let includeCoreInShortcut = false;

  if (omitCore) {
    includeCoreInShortcut = false;
  } else if (includeCore) {
    includeCoreInShortcut = true;
  } else {
    includeCoreInShortcut = await (async () => {
      const rl2 = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const question2 = (prompt) => new Promise((res) => rl2.question(prompt, res));

      console.clear();

      try {
        while (true) {
          const ans = (await question2(`Rom: ${romBaseName}\nCore: ${coreName}\n\n(Note: You can skip this question by passing -i to include core name or -o to omit it.)\nInclude core name in shortcut? (y/n): `)).trim().toLowerCase();
          if (ans === 'y' || ans === 'yes') return true;
          if (ans === 'n' || ans === 'no') return false;
          console.log('Please answer "y" or "n".');
        }
      } finally {
        rl2.close();
      }
    })();
  }

  const shortcutName = includeCoreInShortcut
    ? `${romBaseName} - ${coreName}.lnk`
    : `${romBaseName}.lnk`;
  const outputPath = path.join(desktopPath, shortcutName);

  const retroArchExePath = path.join(raFolder, 'retroarch.exe');
  const shortcutTarget = `"${retroArchExePath}" -L "${path.join(raFolder, 'cores', core)}" "${rom}"`;

  // Create the shortcut file (Windows .lnk format)
  createShortcutFile(outputPath, shortcutTarget);
}