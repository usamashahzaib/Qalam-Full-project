import os

IGNORE_DIRS = {
    'node_modules', '.git', '.github', 'dist', 'build', 'out', 
    'venv', '.env', 'coverage', 'public', 'assets', 'images'
}
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 
    '.gitignore', '.DS_Store', 'LICENSE', 'README.md', '.env.example'
}
VALID_EXTENSIONS = {
    '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.json', '.html'
}

def build_project_tree(start_dir):
    tree_lines = []
    for root, dirs, files in os.walk(start_dir):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        level = root.replace(start_dir, '').count(os.sep)
        indent = ' ' * 4 * level
        tree_lines.append(f"{indent}[D] {os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            if f not in IGNORE_FILES and os.path.splitext(f)[1] in VALID_EXTENSIONS:
                tree_lines.append(f"{sub_indent}[F] {f}")
    return "\n".join(tree_lines)

def harvest_codebase(start_dir, output_file):
    print("[*] Starting harvest process...")
    with open(output_file, "w", encoding="utf-8") as out:
        out.write("<repository_map>\n" + build_project_tree(start_dir) + "\n</repository_map>\n\n")
        for root, dirs, files in os.walk(start_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                if file in IGNORE_FILES or os.path.splitext(file)[1] not in VALID_EXTENSIONS:
                    continue
                rel_path = os.path.relpath(os.path.join(root, file), start_dir)
                out.write(f'<source_file path="{rel_path}">\n')
                try:
                    with open(os.path.join(root, file), "r", encoding="utf-8", errors="replace") as infile:
                        out.write(infile.read().replace("</source_file>", "<_source_file_closed>"))
                except Exception as e:
                    out.write(f"[ERROR READING FILE: {str(e)}]")
                out.write("\n</source_file>\n\n")
    print(f"[+] Complete. Payload generated: {output_file}")

if __name__ == "__main__":
    harvest_codebase(".", "qalam_audit_payload.xml")