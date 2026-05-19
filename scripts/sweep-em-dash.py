#!/usr/bin/env python3
"""
sweep-em-dash.py — reemplaza todos los em-dash (U+2014) y en-dash (U+2013)
del proyecto por guion simple (-), siguiendo la regla CLAUDE.md seccion 7.

Reglas de reemplazo:
- ' — ' (em-dash con espacios)  ->  ' - '
- '—'  (sin espacios)            ->  '-'
- ' – ' (en-dash con espacios)   ->  ' - '
- '–'  (sin espacios)            ->  '-'

Excluye: node_modules, .git, coverage, dist, build, lock files, binarios.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_DIRS = {'node_modules', '.git', 'coverage', 'dist', 'build', '.vite',
                'playwright-report', 'test-results', '.next', '.cache'}
EXCLUDE_FILES = {'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock',
                 'sweep-em-dash.py'}  # no auto-modificarse
INCLUDE_EXT = {'.js', '.ts', '.jsx', '.tsx', '.md', '.html', '.css',
               '.json', '.toml', '.py', '.txt', '.yml', '.yaml', '.gitattributes'}

EM_DASH = '—'  # —
EN_DASH = '–'  # –

def should_process(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.name in EXCLUDE_FILES:
        return False
    if any(part in EXCLUDE_DIRS for part in path.parts):
        return False
    if path.suffix.lower() in INCLUDE_EXT:
        return True
    if path.name in {'.gitattributes', '.gitignore', '.editorconfig'}:
        return True
    return False

def replace(content: str) -> tuple[str, int]:
    n = content.count(EM_DASH) + content.count(EN_DASH)
    # con espacios primero (mantiene espaciado)
    content = content.replace(f' {EM_DASH} ', ' - ')
    content = content.replace(f' {EN_DASH} ', ' - ')
    # sin espacios (casos raros)
    content = content.replace(EM_DASH, '-')
    content = content.replace(EN_DASH, '-')
    return content, n

def main():
    total_files = 0
    total_occurrences = 0
    changed = []
    for path in ROOT.rglob('*'):
        if not should_process(path):
            continue
        try:
            original = path.read_text(encoding='utf-8')
        except (UnicodeDecodeError, PermissionError):
            continue
        if EM_DASH not in original and EN_DASH not in original:
            continue
        new, n = replace(original)
        if new != original:
            path.write_text(new, encoding='utf-8', newline='\n' if '\n' in original and '\r\n' not in original else None)
            # preservar saltos de linea del original
            if '\r\n' in original:
                path.write_text(new.replace('\n', '\r\n').replace('\r\r\n', '\r\n'),
                                encoding='utf-8', newline='')
            total_files += 1
            total_occurrences += n
            changed.append((path.relative_to(ROOT), n))

    print(f"Archivos modificados: {total_files}")
    print(f"Total reemplazos: {total_occurrences}")
    print()
    for relpath, n in sorted(changed, key=lambda x: -x[1])[:20]:
        print(f"  {n:4d}  {relpath}")
    if len(changed) > 20:
        print(f"  ...y {len(changed) - 20} archivos mas")

if __name__ == '__main__':
    main()
