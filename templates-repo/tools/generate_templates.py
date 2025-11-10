#!/usr/bin/env python3
"""
Dynamic Template Generator - Updated for new clean structure

Generates templates from YAML configurations and reference templates.
Uses the clean shared-reference template and template-specific directory structures.
"""

import json
import os
import shutil
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import yaml
import argparse
import re
import hashlib
import difflib
import fnmatch
import subprocess


class Colors:
    """ANSI color codes for terminal output"""
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color


def log_info(message: str) -> None:
    """Log info message to stderr"""
    print(f"{Colors.GREEN}[INFO]{Colors.NC} {message}", file=sys.stderr)


def log_warn(message: str) -> None:
    """Log warning message to stderr"""
    print(f"{Colors.YELLOW}[WARN]{Colors.NC} {message}", file=sys.stderr)


def log_error(message: str) -> None:
    """Log error message to stderr"""
    print(f"{Colors.RED}[ERROR]{Colors.NC} {message}", file=sys.stderr)


class TemplateGenerator:
    """Clean template generator using shared-reference and template directories"""
    
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.reference_dir = root_dir / "reference"
        self.definitions_dir = root_dir / "definitions" 
        self.build_dir = root_dir / "build"
        self.originals_dir = root_dir / "originals"

        # DRY ignore patterns used consistently for copy and verify operations
        # Keep both directory names and recursive forms to support both filtering styles
        self.DEFAULT_IGNORES: List[str] = [
            '.DS_Store',
            '.eslintcache',
            '.git',
            '.git/**',
            'node_modules',
            'node_modules/*',
            '.wrangler',
            '.wrangler/**',
            'dist',
            'dist/**',
            '.next',
            '.next/**',
            'coverage',
            'coverage/**',
            '.nyc_output',
            '.nyc_output/**',
            'bun.lock*',
            'pnpm-lock.yaml',
            'yarn.lock',
            'package-lock.json',
            'next-env.d.ts',
        ]
    
    def apply_package_patches(self, target_dir: Path, patches: Dict[str, Any]) -> bool:
        """
        Apply patches to package.json file.
        
        Args:
            target_dir: Target template directory
            patches: Dictionary of patches to apply
            
        Returns:
            True if successful, False otherwise
        """
        package_json_path = target_dir / "package.json"
        
        if not package_json_path.exists():
            log_warn(f"package.json not found: {package_json_path}")
            return True  # Not an error for templates that might not have it
        
        try:
            # Read existing package.json
            with open(package_json_path, 'r', encoding='utf-8') as f:
                package_data = json.load(f)
            
            # Apply patches (deep merge, handling null values for removal)
            def deep_merge_with_null(base: dict, patch: dict) -> dict:
                result = base.copy()
                for key, value in patch.items():
                    if value is None:
                        # Remove the key if value is null
                        result.pop(key, None)
                    elif key in result and isinstance(result[key], dict) and isinstance(value, dict):
                        result[key] = deep_merge_with_null(result[key], value)
                    else:
                        result[key] = value
                return result
            
            package_data = deep_merge_with_null(package_data, patches)
            
            # Write updated package.json (preserve original formatting by using tabs like originals)
            with open(package_json_path, 'w', encoding='utf-8') as f:
                json.dump(package_data, f, indent='\t', ensure_ascii=False)
                f.write('\n')  # Add trailing newline to match originals
            
            log_info(f"Applied package.json patches to {package_json_path}")
            return True
            
        except Exception as e:
            log_error(f"Failed to patch package.json: {e}")
            return False

    def copy_reference_template(self, reference_name: str, target_dir: Path) -> bool:
        """
        Copy reference template to target directory.
        
        Args:
            reference_name: Name of reference template (e.g. "vite-reference", "next-reference")
            target_dir: Target directory path
            
        Returns:
            True if successful, False otherwise
        """
        reference_path = self.reference_dir / reference_name
        
        if not reference_path.exists():
            log_error(f"Reference template not found: {reference_path}")
            return False
        
        try:
            # Remove target if exists
            if target_dir.exists():
                shutil.rmtree(target_dir)
            
            # Create target directory
            target_dir.mkdir(parents=True)
            
            # Copy reference template with ignore patterns
            self.copytree_with_ignores(reference_path, target_dir)
            log_info(f"Copied {reference_name} reference template to {target_dir}")
            return True
            
        except Exception as e:
            log_error(f"Failed to copy reference template: {e}")
            return False
    
    def apply_template_specific_files(self, template_name: str, target_dir: Path, specific_files: List[str] = None) -> bool:
        """
        Apply template-specific files from the template directory.
        
        Args:
            template_name: Name of the template
            target_dir: Target template directory
            specific_files: List of specific files/directories to copy (if None, copy all)
            
        Returns:
            True if successful, False otherwise
        """
        template_dir = self.definitions_dir / template_name
        
        if not template_dir.exists():
            log_error(f"Template directory not found: {template_dir}")
            return False
        
        try:
            if specific_files:
                # Copy only specified files/directories
                for file_pattern in specific_files:
                    src_path = template_dir / file_pattern
                    
                    if not src_path.exists():
                        log_warn(f"Specified template file not found: {file_pattern}")
                        continue
                    
                    if src_path.is_file():
                        # Copy single file
                        dst_path = target_dir / file_pattern
                        dst_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src_path, dst_path)
                        log_info(f"Applied template file: {file_pattern}")
                    else:
                        # Copy directory (respecting ignore patterns)
                        dst_path = target_dir / file_pattern
                        if dst_path.exists():
                            shutil.rmtree(dst_path)
                        self.copytree_with_ignores(src_path, dst_path)
                        log_info(f"Applied template directory: {file_pattern}")
            else:
                # Copy all files from template directory to target (excluding YAML config)
                for root, dirs, files in os.walk(template_dir):
                    root_path = Path(root)
                    rel_root = root_path.relative_to(template_dir)
                    
                    # Filter ignored directories in-place for performance
                    dirs[:] = [d for d in dirs if not self._is_ignored(str((root_path / d).relative_to(template_dir)), self.DEFAULT_IGNORES)]

                    # Create directories in target
                    target_root = target_dir / rel_root if str(rel_root) != '.' else target_dir
                    target_root.mkdir(parents=True, exist_ok=True)
                    
                    # Copy files
                    for file in files:
                        # Skip certain files that shouldn't be copied
                        if file in ['.DS_Store', '.eslintcache', '.template-definition.json'] or file.endswith('.yaml'):
                            continue
                        
                        src_file = root_path / file
                        dst_file = target_root / file
                        rel_file = str(src_file.relative_to(template_dir))
                        if self._is_ignored(rel_file, self.DEFAULT_IGNORES):
                            continue
                        
                        # Copy file, overwriting if it exists
                        shutil.copy2(src_file, dst_file)
                        log_info(f"Applied template file: {rel_root / file if str(rel_root) != '.' else file}")
            
            return True
            
        except Exception as e:
            log_error(f"Failed to apply template-specific files: {e}")
            return False
    
    def generate_template_from_yaml(self, yaml_file: Path) -> bool:
        """
        Generate a template from YAML configuration.
        
        Args:
            yaml_file: Path to YAML configuration file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Load YAML configuration
            with open(yaml_file, 'r', encoding='utf-8') as f:
                config = yaml.safe_load(f)
            
            template_name = config['name']
            base_reference = config.get('base_reference', 'shared-reference')
            template_specific_files = config.get('template_specific_files')
            excludes = config.get('excludes', [])
            package_patches = config.get('package_patches')
            
            log_info(f"Generating template: {template_name}")
            
            target_dir = self.build_dir / template_name
            
            # Step 1: Copy reference template
            if not self.copy_reference_template(base_reference, target_dir):
                return False
            
            # Step 2: Apply template-specific files from template directory
            if not self.apply_template_specific_files(template_name, target_dir, template_specific_files):
                return False
            
            # Step 3: Apply package.json patches if specified
            if package_patches:
                if not self.apply_package_patches(target_dir, package_patches):
                    return False
            
            # Step 4: Apply excludes (remove files introduced by reference or overlays)
            if excludes:
                self.apply_excludes(target_dir, excludes)
            
            log_info(f"✅ Successfully generated template: {template_name}")
            return True
            
        except Exception as e:
            log_error(f"Failed to generate template from {yaml_file}: {e}")
            return False
    
    def generate_all_templates(self) -> bool:
        """
        Generate all templates from YAML definition files.
        
        Returns:
            True if all successful, False if any failed
        """
        log_info("Starting template generation process...")
        
        # Ensure build directory exists
        self.build_dir.mkdir(exist_ok=True)
        
        success_count = 0
        failure_count = 0
        
        # Find all YAML template definition files
        for yaml_file in self.definitions_dir.glob("*.yaml"):
            if self.generate_template_from_yaml(yaml_file):
                success_count += 1
            else:
                failure_count += 1
        
        log_info(f"Template generation complete: {success_count} success, {failure_count} failed")
        return failure_count == 0
    
    def generate_specific_template(self, template_name: str) -> bool:
        """
        Generate a specific template by name.
        
        Args:
            template_name: Name of template to generate
            
        Returns:
            True if successful, False otherwise
        """
        yaml_file = self.definitions_dir / f"{template_name}.yaml"
        
        if not yaml_file.exists():
            log_error(f"Template configuration not found: {yaml_file}")
            return False
        
        return self.generate_template_from_yaml(yaml_file)
    
    # ===== Verification utilities =====
    def _iter_files(self, base: Path, ignores: List[str]) -> List[str]:
        files: List[str] = []
        for root, dirs, filenames in os.walk(base):
            root_path = Path(root)
            for name in filenames:
                rel = str((root_path / name).relative_to(base))
                if self._is_ignored(rel, ignores):
                    continue
                files.append(rel)
        return sorted(files)

    def _is_ignored(self, rel_path: str, ignores: List[str]) -> bool:
        patterns = self.DEFAULT_IGNORES + (ignores or [])
        return any(fnmatch.fnmatch(rel_path, pat) for pat in patterns)

    def copytree_with_ignores(self, src: Path, dst: Path) -> None:
        """Copy a directory tree while ignoring DEFAULT_IGNORES patterns.

        Uses shutil.copytree with an ignore callable compatible with our glob patterns,
        keeping a single source of truth for ignore rules.
        """
        base = Path(src)

        def _ignore(this_src: str, names: List[str]):  # type: ignore[override]
            rels: List[str] = []
            for name in names:
                p = Path(this_src) / name
                try:
                    rel = str(Path(p).relative_to(base))
                except Exception:
                    rel = name
                rels.append(rel)
            # Decide which names to ignore
            ignored: List[str] = []
            for name, rel in zip(names, rels):
                if self._is_ignored(rel, []):
                    ignored.append(name)
            return set(ignored)

        shutil.copytree(src, dst, dirs_exist_ok=True, ignore=_ignore)

    def _md5(self, path: Path) -> str:
        h = hashlib.md5()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                h.update(chunk)
        return h.hexdigest()

    def _md5_text_normalized(self, path: Path) -> str:
        """Compute MD5 of text with normalized EOL and without a final trailing newline.

        - Converts CRLF to LF
        - Removes a single trailing newline if present
        This avoids false diffs from platform EOLs and EOF newline-only differences.
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                s = f.read()
            # Normalize EOLs
            s = s.replace('\r\n', '\n').replace('\r', '\n')
            # Remove a single trailing newline
            if s.endswith('\n'):
                s = s[:-1]
            h = hashlib.md5()
            h.update(s.encode('utf-8'))
            return h.hexdigest()
        except Exception:
            # Fallback to raw md5 if any issue
            return self._md5(path)

    def _is_text(self, path: Path) -> bool:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                f.read(2048)
            return True
        except Exception:
            return False

    def verify_template(self, template_name: str, show_diffs: bool = False, summary_only: bool = False, ignores: List[str] = None) -> bool:
        orig_dir = self.originals_dir / template_name
        build_dir = self.build_dir / template_name
        if not orig_dir.exists():
            log_error(f"Original template not found: {orig_dir}")
            return False
        if not build_dir.exists():
            log_error(f"Build template not found: {build_dir}")
            return False

        orig_files = self._iter_files(orig_dir, ignores or [])
        build_files = self._iter_files(build_dir, ignores or [])

        orig_set = set(orig_files)
        build_set = set(build_files)

        added = sorted(list(build_set - orig_set))
        removed = sorted(list(orig_set - build_set))
        common = sorted(list(orig_set & build_set))

        modified: List[str] = []
        for rel in common:
            o = orig_dir / rel
            b = build_dir / rel
            if self._is_text(o) and self._is_text(b):
                if self._md5_text_normalized(o) != self._md5_text_normalized(b):
                    modified.append(rel)
            else:
                if self._md5(o) != self._md5(b):
                    modified.append(rel)

        ok = not (added or removed or modified)

        header = f"Verification for {template_name}:"
        print(f"{Colors.BLUE}{header}{Colors.NC}")
        if ok:
            print(f"  {Colors.GREEN}✓ No differences{Colors.NC}")
        else:
            if added:
                print(f"  {Colors.YELLOW}+ Added ({len(added)}):{Colors.NC}")
                if not summary_only:
                    for a in added:
                        print(f"    + {a}")
            if removed:
                print(f"  {Colors.YELLOW}- Removed ({len(removed)}):{Colors.NC}")
                if not summary_only:
                    for r in removed:
                        print(f"    - {r}")
            if modified:
                print(f"  {Colors.RED}~ Modified ({len(modified)}):{Colors.NC}")
                if not summary_only:
                    for m in modified:
                        print(f"    ~ {m}")

        if show_diffs and modified and not summary_only:
            for rel in modified:
                o = orig_dir / rel
                b = build_dir / rel
                if self._is_text(o) and self._is_text(b):
                    try:
                        with open(o, 'r', encoding='utf-8') as fo, open(b, 'r', encoding='utf-8') as fb:
                            o_lines = fo.readlines()
                            b_lines = fb.readlines()
                        diff = difflib.unified_diff(o_lines, b_lines, fromfile=f"originals/{template_name}/{rel}", tofile=f"build/{template_name}/{rel}")
                        print(''.join(diff))
                    except Exception as e:
                        log_warn(f"Failed to diff {rel}: {e}")
                else:
                    print(f"    (binary or non-text difference) {rel}")

        return ok

    def verify_all(self, show_diffs: bool = False, summary_only: bool = False, ignores: List[str] = None, only_template: Optional[str] = None) -> bool:
        names: List[str]
        if only_template:
            names = [only_template]
        else:
            names = [p.name for p in self.originals_dir.iterdir() if p.is_dir()]
        any_failed = False
        for name in sorted(names):
            ok = self.verify_template(name, show_diffs=show_diffs, summary_only=summary_only, ignores=ignores or [])
            if not ok:
                any_failed = True
        return not any_failed

    # ===== Excludes support =====
    def apply_excludes(self, target_dir: Path, patterns: List[str]) -> None:
        # Collect matches via os.walk + fnmatch
        to_remove: List[Path] = []
        rel_paths: List[str] = []
        for root, dirs, files in os.walk(target_dir):
            root_path = Path(root)
            for name in files:
                rel = str((root_path / name).relative_to(target_dir))
                if any(fnmatch.fnmatch(rel, pat) for pat in patterns):
                    rel_paths.append(rel)
                    to_remove.append(root_path / name)
        # Remove files
        for p in to_remove:
            try:
                p.unlink(missing_ok=True)
            except Exception as e:
                log_warn(f"Failed to remove excluded file {p}: {e}")
        # Clean up empty directories
        for root, dirs, files in os.walk(target_dir, topdown=False):
            if not dirs and not files:
                try:
                    Path(root).rmdir()
                except Exception:
                    pass

    # ===== Bun viability checks =====
    def _run_cmd(self, cmd: List[str], cwd: Path) -> int:
        try:
            proc = subprocess.run(cmd, cwd=str(cwd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            print(proc.stdout)
            return proc.returncode
        except FileNotFoundError:
            log_error(f"Command not found: {' '.join(cmd)}")
            return 127
        except Exception as e:
            log_error(f"Failed to run {' '.join(cmd)}: {e}")
            return 1

    def run_bun_checks_for_template(self, template_name: str) -> bool:
        template_dir = self.build_dir / template_name
        if not template_dir.exists():
            log_error(f"Build template not found for Bun checks: {template_dir}")
            return False
        log_info(f"Running Bun checks in {template_dir} ...")
        rc_install = self._run_cmd(["bun", "i"], template_dir)
        if rc_install != 0:
            log_error(f"bun i failed for {template_name} (exit {rc_install})")
            return False
        rc_lint = self._run_cmd(["bun", "run", "lint"], template_dir)
        if rc_lint != 0:
            log_error(f"bun run lint failed for {template_name} (exit {rc_lint})")
            return False
        rc_build = self._run_cmd(["bun", "run", "build"], template_dir)
        if rc_build != 0:
            log_error(f"bun run build failed for {template_name} (exit {rc_build})")
            return False
        log_info(f"Bun checks passed for {template_name}")
        return True

    def run_bun_checks_all(self, only_template: Optional[str] = None) -> bool:
        names: List[str]
        if only_template:
            names = [only_template]
        else:
            # Prefer templates present in build directory
            names = [p.name for p in self.build_dir.iterdir() if p.is_dir()]
        any_failed = False
        for name in sorted(names):
            if not self.run_bun_checks_for_template(name):
                any_failed = True
        return not any_failed


def main() -> None:
    """Main function"""
    parser = argparse.ArgumentParser(description="Generate templates from YAML definitions")
    parser.add_argument(
        "--root",
        "-r",
        default=".",
        help="Root directory containing reference/, definitions/, and build/ folders"
    )
    parser.add_argument(
        "--template",
        "-t",
        help="Generate specific template only (template name)"
    )
    parser.add_argument(
        "--clean",
        "-c",
        action="store_true",
        help="Clean build directory before generation"
    )
    parser.add_argument(
        "--verify",
        "-V",
        action="store_true",
        help="Verify built templates against originals and run Bun install/lint/build (use --no-bun to skip Bun)"
    )
    parser.add_argument(
        "--diffs",
        "-d",
        action="store_true",
        help="Show unified diffs for modified files during verification"
    )
    parser.add_argument(
        "--summary-only",
        "-s",
        action="store_true",
        help="Only print summary lines (no per-file lists)"
    )
    parser.add_argument(
        "--ignore",
        "-i",
        action="append",
        default=[],
        help="Additional ignore patterns (glob). Can be specified multiple times"
    )
    parser.add_argument(
        "--no-bun",
        action="store_true",
        help="Skip Bun install/lint/build viability checks"
    )
    args = parser.parse_args()
    
    root_dir = Path(args.root).resolve()
    generator = TemplateGenerator(root_dir)
    
    # Note: Verification will only run when --verify is explicitly provided.

    # Clean build directory if requested
    if args.clean and generator.build_dir.exists():
        log_info("Cleaning build directory...")
        shutil.rmtree(generator.build_dir)
        generator.build_dir.mkdir(parents=True)
    
    if args.template:
        # Generate specific template
        if generator.generate_specific_template(args.template):
            log_info("Template generation successful")
            # Run verification and Bun checks only if explicitly requested
            if args.verify:
                only = args.template
                ok_diff = generator.verify_all(show_diffs=args.diffs, summary_only=args.summary_only, ignores=args.ignore, only_template=only)
                ok_bun = True if args.no_bun else generator.run_bun_checks_all(only_template=only)
                if not (ok_diff and ok_bun):
                    log_error("Post-generation verification failed")
                    sys.exit(2)
            sys.exit(0)
        else:
            log_error("Template generation failed")
            sys.exit(1)
    else:
        # Generate all templates
        if generator.generate_all_templates():
            log_info("All templates generated successfully")
            # Run verification and Bun checks only if explicitly requested
            if args.verify:
                ok_diff = generator.verify_all(show_diffs=args.diffs, summary_only=args.summary_only, ignores=args.ignore)
                ok_bun = True if args.no_bun else generator.run_bun_checks_all()
                if not (ok_diff and ok_bun):
                    log_error("Post-generation verification failed")
                    sys.exit(2)
            sys.exit(0)
        else:
            log_error("Some template generations failed")
            sys.exit(1)


if __name__ == "__main__":
    main()