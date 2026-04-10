#!/usr/bin/env python3
"""
SOM Project Snapshot Generator
===============================
Run this before starting a new AI session to generate a complete
project state summary. Output goes to SNAPSHOT.md in the repo root.

Usage:
    python snapshot.py

What it captures:
    - Project file structure with last-modified dates
    - Frontend dependencies (package.json)
    - Backend dependencies (requirements.txt)
    - Environment variable names from .env.example (if exists)
    - Last 10 git commits as a mini-changelog
    - Current git branch and tags
    - Railway deploy info (if Railway CLI available)
"""

import os
import json
import subprocess
from datetime import datetime
from pathlib import Path


def run_cmd(cmd, cwd=None):
    """Run a shell command and return output, or empty string on failure."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, cwd=cwd, timeout=10
        )
        return result.stdout.strip()
    except Exception:
        return ""


def get_file_tree(root, max_depth=3, prefix="", depth=0):
    """Generate a tree view of the project, excluding common junk directories."""
    SKIP = {
        "node_modules", ".git", "__pycache__", ".vite", "dist", "build",
        ".next", ".cache", "venv", ".env", ".DS_Store"
    }
    lines = []
    try:
        entries = sorted(Path(root).iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
    except PermissionError:
        return lines

    for i, entry in enumerate(entries):
        if entry.name in SKIP:
            continue
        is_last = (i == len(entries) - 1)
        connector = "└── " if is_last else "├── "

        if entry.is_dir():
            lines.append(f"{prefix}{connector}{entry.name}/")
            if depth < max_depth:
                extension = "    " if is_last else "│   "
                lines.extend(get_file_tree(entry, max_depth, prefix + extension, depth + 1))
        else:
            mod_time = datetime.fromtimestamp(entry.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
            size_kb = entry.stat().st_size / 1024
            lines.append(f"{prefix}{connector}{entry.name}  ({size_kb:.1f}KB, {mod_time})")

    return lines


def read_json(filepath):
    """Read a JSON file and return the parsed object."""
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except Exception:
        return None


def read_text(filepath):
    """Read a text file and return its contents."""
    try:
        with open(filepath, "r") as f:
            return f.read().strip()
    except Exception:
        return None


def get_env_vars(root):
    """Extract environment variable names from .env.example or .env files."""
    env_vars = []
    for env_file in [".env.example", ".env.sample", ".env"]:
        filepath = os.path.join(root, env_file)
        content = read_text(filepath)
        if content:
            for line in content.splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    var_name = line.split("=")[0].strip()
                    env_vars.append(var_name)
            return env_vars, env_file
    return env_vars, None


def generate_snapshot(project_root="."):
    """Generate the full project snapshot."""
    project_root = os.path.abspath(project_root)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = []
    lines.append(f"# SOM PROJECT SNAPSHOT")
    lines.append(f"> Generated: {now}")
    lines.append(f"> Root: {project_root}")
    lines.append("")

    # --- Git Info ---
    lines.append("## GIT STATUS")
    branch = run_cmd("git branch --show-current", cwd=project_root)
    lines.append(f"**Branch:** {branch or 'unknown'}")

    last_commit = run_cmd("git log -1 --format='%h %s (%ar)'", cwd=project_root)
    lines.append(f"**Last Commit:** {last_commit}")

    tags = run_cmd("git tag --sort=-creatordate | head -5", cwd=project_root)
    if tags:
        lines.append(f"**Recent Tags:**")
        for tag in tags.splitlines():
            lines.append(f"  - {tag}")
    else:
        lines.append("**Tags:** None (consider creating a stable release tag!)")

    dirty = run_cmd("git status --porcelain", cwd=project_root)
    lines.append(f"**Working Tree:** {'DIRTY — uncommitted changes' if dirty else 'Clean'}")
    lines.append("")

    # --- Recent Commits ---
    lines.append("## LAST 10 COMMITS")
    commits = run_cmd("git log -10 --format='%h | %ar | %s'", cwd=project_root)
    if commits:
        lines.append("```")
        lines.append(commits)
        lines.append("```")
    lines.append("")

    # --- Quick Diff (last 3 days) ---
    lines.append("## QUICK DIFF — FILES CHANGED IN LAST 3 DAYS")
    diff_files = run_cmd(
        "git log --since='3 days ago' --name-only --pretty=format: | sort -u | grep -v '^$'",
        cwd=project_root
    )
    if diff_files:
        lines.append("> These files were modified in the last 3 days:")
        for f in diff_files.splitlines():
            lines.append(f"  - `{f.strip()}`")
        # Also show the actual commit messages for those changes
        recent_msgs = run_cmd(
            "git log --since='3 days ago' --format='  %h %s (%ar)' --no-merges",
            cwd=project_root
        )
        if recent_msgs:
            lines.append("")
            lines.append("**Recent commit messages:**")
            lines.append("```")
            lines.append(recent_msgs)
            lines.append("```")
    else:
        lines.append("> No changes in the last 3 days.")
    lines.append("")

    # --- File Tree ---
    lines.append("## FILE STRUCTURE")
    lines.append("```")
    tree = get_file_tree(project_root, max_depth=3)
    lines.extend(tree[:200])  # Cap at 200 lines to prevent huge output
    if len(tree) > 200:
        lines.append(f"... and {len(tree) - 200} more entries")
    lines.append("```")
    lines.append("")

    # --- Frontend Dependencies ---
    pkg_path = os.path.join(project_root, "package.json")
    pkg = read_json(pkg_path)
    if pkg:
        lines.append("## FRONTEND DEPENDENCIES (package.json)")
        lines.append(f"**Name:** {pkg.get('name', 'unknown')}")
        lines.append(f"**Version:** {pkg.get('version', 'unknown')}")
        lines.append("")
        deps = pkg.get("dependencies", {})
        if deps:
            lines.append("### Dependencies")
            for name, version in sorted(deps.items()):
                lines.append(f"  - {name}: {version}")
        dev_deps = pkg.get("devDependencies", {})
        if dev_deps:
            lines.append("### Dev Dependencies")
            for name, version in sorted(dev_deps.items()):
                lines.append(f"  - {name}: {version}")
        lines.append("")

    # --- Backend Dependencies ---
    for req_path in ["requirements.txt", "motesart-backend/requirements.txt"]:
        full_path = os.path.join(project_root, req_path)
        reqs = read_text(full_path)
        if reqs:
            lines.append(f"## BACKEND DEPENDENCIES ({req_path})")
            for line in reqs.splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    lines.append(f"  - {line}")
            lines.append("")
            break

    # --- Environment Variables ---
    env_vars, env_file = get_env_vars(project_root)
    if env_vars:
        lines.append(f"## ENVIRONMENT VARIABLES (from {env_file})")
        lines.append("> Names only — values are secret")
        for var in env_vars:
            lines.append(f"  - {var}")
        lines.append("")

    # --- Project Brain Check ---
    brain_path = os.path.join(project_root, "PROJECT_BRAIN.md")
    if os.path.exists(brain_path):
        mod_time = datetime.fromtimestamp(os.path.getmtime(brain_path)).strftime("%Y-%m-%d %H:%M")
        lines.append(f"## PROJECT BRAIN")
        lines.append(f"**Found:** PROJECT_BRAIN.md (last updated: {mod_time})")
        lines.append("AI sessions should read this file first for full project context.")
    else:
        lines.append("## PROJECT BRAIN")
        lines.append("**WARNING:** No PROJECT_BRAIN.md found! Create one for AI session context.")
    lines.append("")

    # --- Output ---
    snapshot_content = "\n".join(lines)

    # Write to file
    output_path = os.path.join(project_root, "SNAPSHOT.md")
    with open(output_path, "w") as f:
        f.write(snapshot_content)

    print(f"✅ Snapshot saved to: {output_path}")
    print(f"   {len(lines)} lines, {len(snapshot_content)} characters")
    print(f"   Generated at: {now}")

    return snapshot_content


if __name__ == "__main__":
    import sys
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    generate_snapshot(root)
