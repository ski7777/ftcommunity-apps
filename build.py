#! /usr/bin/env python3
# -*- coding: utf-8 -*-
#

# Improvements:
# - check if zip file needs to be rebuild

import sys
import os
import configparser

commit_msg = ""
if "TRAVIS_COMMIT_MESSAGE" in os.environ:
    commit_msg = os.environ["TRAVIS_COMMIT_MESSAGE"]

pr = ""
if "TRAVIS_PULL_REQUEST" in os.environ:
    pr = os.environ["TRAVIS_PULL_REQUEST"]

os.system("git checkout $TRAVIS_BRANCH")

build = False
commit_range = os.environ["TRAVIS_COMMIT_RANGE"].split("...")
git_log = os.popen("git diff-tree --no-commit-id --name-only -r " + commit_range[0] + " " + commit_range[1]).read().split("\n")
for change in git_log:
    if change == "":
        continue
    if change == "build.py":
        print("Changed: " + change)
        build = True
    if not "/" in change:
        continue
    if ".zip" in change.split("/")[1]:
        continue
    if "00packages" in change:
        continue
    if os.path.isfile(change):
        print("Changed: " + change)
        build = True

if not build or "true" in pr:
    print("Nothing Changed")
    print("Aborting!")
    sys.exit(0)

os.system("rm packages/*.zip")
print("Building package index ...")

packages = configparser.RawConfigParser()
# scan the directory for app directories
os.chdir("packages")
for l in sorted(os.listdir(".")):
    if os.path.isdir(os.path.join(l)):
        m = os.path.join(l, "manifest")
        if os.path.isfile(m):
            package = configparser.RawConfigParser()
            package.read_file(open(m, "r", encoding="utf8"))
            if not (package.has_option("app", "name") and package.has_option("app", "uuid") and package.has_option("app", "exec")):
                print(l, "is not a valid app! Passing!")
                continue
            print("Adding", l, "...")

            general_copy = ["name", "category", "author", "icon", "desc", "exec", "html", "managed", "uuid", "version", "firmware"]
            lang_copy = ["name", "desc", "html"]
            name = package.get("app", "name")
            packages.add_section(l)
            for entry in general_copy:
                if package.has_option("app", entry):
                    packages.set(l, entry, package.get("app", entry))
            for lang in package.sections():
                if lang == "app":
                    continue
                for entry in lang_copy:
                    if package.has_option(lang, entry):
                        packages.set(l, entry + "_" + lang, package.get(lang, entry))
            os.system("cd " + l + "; zip -r ../" + l + ".zip *")

pkgfile = open("00packages", "w")
packages.write(pkgfile)
pkgfile.close()
os.system("git config --global push.default simple")
os.system("git add -A")
os.system('git -c user.name="$GITHUB_USER" -c user.email="$GITHUB_MAIL" commit -a -m "Travis: Rebuilt package archives from $TRAVIS_COMMIT_RANGE"')
os.system('git push -f -q https://$GITHUB_USER:$GITHUB_API_KEY@github.com/$TRAVIS_REPO_SLUG/')
