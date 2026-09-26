#!/usr/bin/env bash
set -Eeuo pipefail
export CI=1


RESET=$'\033[0m'

BLACK=$'\033[30m'
WHITE=$'\033[37m'

BRIGHT_BLACK=$'\033[90m'   # gray-ish / dim
BRIGHT_WHITE=$'\033[97m'

BOLD=$'\033[1m'
DIM=$'\033[2m'
REVERSE=$'\033[7m'

CLEAR_LINE=$'\033[2K'
HIDE_CURSOR=$'\033[?25l'
SHOW_CURSOR=$'\033[?25h'

SPIN_FRAMES=(
  '⠋'
  '⠙'
  '⠹'
  '⠸'
  '⠼'
  '⠴'
  '⠦'
  '⠧'
  '⠇'
  '⠏'
)

# Disable animation when stdout is not a terminal.
if [[ -t 1 ]] && [[ "${TERM:-dumb}" != "dumb" ]]; then
  ANIMATE=1
else
  ANIMATE=0
  HIDE_CURSOR=""
  SHOW_CURSOR=""
fi

START=$(date +%s)
TMP_DIR=$(mktemp -d)

cleanup() {
  printf '%s%s' "$RESET" "$SHOW_CURSOR"
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

printf '%s' "$HIDE_CURSOR"




section() {
  local title="$1"

  printf '\n'
  printf '%s%s  %s  %s%s\n' \
    "$REVERSE" "$BLACK" "$title" "$BLACK" "$RESET"

    "$BRIGHT_BLACK" "$RESET"
}

ok() {
  printf '  %s%s✓%s %s\n' \
    "$WHITE" "$BOLD" "$RESET" "$*"
}

skip() {
  printf '  %s↳%s %s%s%s\n' \
    "$BRIGHT_BLACK" "$RESET" "$DIM" "$*" "$RESET"
}

info() {
  printf '  %s·%s %s\n' \
    "$BRIGHT_BLACK" "$RESET" "$*"
}

warn() {
  printf '  %s%s!%s %s\n' \
    "$WHITE" "$BOLD" "$RESET" "$*"
}

die() {
  printf '\n%s%s✗ %s%s\n\n' \
    "$WHITE" "$BOLD" "$*" "$RESET" >&2
  exit 1
}

has() {
  command -v "$1" >/dev/null 2>&1
}


 
# Animated command runner
 

spinner_start() {
  local label="$1"
  local pid="$2"
  local i=0

  if (( ! ANIMATE )); then
    return 0
  fi

  while kill -0 "$pid" 2>/dev/null; do
    printf '\r%s%s %s%s' \
      "$BRIGHT_BLACK" \
      "${SPIN_FRAMES[i]}" \
      "$label" \
      "$RESET"

    i=$(( (i + 1) % ${#SPIN_FRAMES[@]} ))

    sleep 0.08
  done

  printf '\r%s%s' "$CLEAR_LINE" "$RESET"
}

run() {
  local label="$1"
  shift

  local log_file="$TMP_DIR/run-$RANDOM.log"

  "$@" >"$log_file" 2>&1 &
  local pid=$!

  spinner_start "$label" "$pid"

  local rc=0

  if wait "$pid"; then
    rc=0
  else
    rc=$?
  fi

  if (( rc != 0 )); then
    printf '  %s%s✗%s %s\n' \
      "$WHITE" "$BOLD" "$RESET" "$label"

    printf '%s\n' "$BRIGHT_BLACK" >&2
    cat "$log_file" >&2
    printf '%s\n' "$RESET" >&2

    return "$rc"
  fi

  ok "$label"
}

run_shell() {
  local label="$1"
  local command="$2"

  local log_file="$TMP_DIR/run-$RANDOM.log"

  bash -c "$command" >"$log_file" 2>&1 &
  local pid=$!

  spinner_start "$label" "$pid"

  local rc=0

  if wait "$pid"; then
    rc=0
  else
    rc=$?
  fi

  if (( rc != 0 )); then
    printf '  %s%s✗%s %s\n' \
      "$WHITE" "$BOLD" "$RESET" "$label"

    cat "$log_file" >&2

    return "$rc"
  fi

  ok "$label"
}



 



 
section "SYSTEM"


if ! has curl; then
  die "curl is required. Install it with: sudo apt install curl"
fi

# Don't require sudo until we actually need it.
export PATH="$HOME/.local/bin:$HOME/.opencode/bin:$HOME/go/bin:$PATH"


 
section "NVM + NODE"


export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  skip "nvm"
else
  run_shell \
    "Installing nvm" \
    'curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash'
fi

[[ -s "$NVM_DIR/nvm.sh" ]] || \
  die "nvm installation finished but $NVM_DIR/nvm.sh was not found"

# shellcheck disable=SC1090
source "$NVM_DIR/nvm.sh"


if nvm ls 26 >/dev/null 2>&1; then
  skip "Node.js 26"
else
  run_shell \
    "Installing Node.js 26" \
    "source '$NVM_DIR/nvm.sh' && nvm install 26"
fi


run_shell \
  "Selecting Node.js 26" \
  "source '$NVM_DIR/nvm.sh' && nvm alias default 26 && nvm use 26"


node_version="$(node -v)"
npm_version="$(npm -v)"

ok "node $node_version"
info "npm $npm_version"


 
section "COREPACK + PNPM"


run \
  "Installing Corepack" \
  npm install -g corepack

run_shell \
  "Enabling pnpm" \
  'corepack enable pnpm'

run_shell \
  "Activating latest pnpm" \
  'corepack install --global pnpm@latest'

pnpm_version="$(pnpm -v)"

ok "pnpm $pnpm_version"


 
section "OPENCODE"


if has opencode; then
  skip "opencode"
else
  run_shell \
    "Installing OpenCode" \
    'curl -fsSL https://opencode.ai/install | bash'

  export PATH="$HOME/.opencode/bin:$HOME/.local/bin:$PATH"

  if has opencode; then
    ok "opencode"
  else
    warn "OpenCode was installed but is not visible on the current PATH"
    info "Open a new shell after this script finishes"
  fi
fi


 
section "SKILLS"


add_skill() {
  local repo="$1"
  shift

  run \
    "Adding $repo" \
    npx --yes skills add "$repo" --global "$@" --yes
}


add_skill miguelspizza/skills --skill write-good-docs
add_skill pbakaus/impeccable
add_skill JuliusBrussee/caveman
add_skill blader/humanizer
add_skill ghaida/intent


 
section "NPM LSPs"


run \
  "Installing npm language servers" \
  npm install -g \
    vscode-langservers-extracted \
    typescript-language-server \
    yaml-language-server \
    tailwindcss-language-server \
    bash-language-server \
    svelte-language-server \
    "@vue/language-server" \
    "@astrojs/language-server" \
    graphql-language-service-cli \
    "@prisma/language-server" \
    dockerfile-language-server-nodejs \
    intelephense \
    pyright \
    "@taplo/cli"


 
section "PYTHON TOOLS"


if has pipx; then
  skip "pipx"
else
  if ! has sudo; then
    die "pipx is not installed and sudo is unavailable"
  fi

  run \
    "Refreshing apt package index" \
    sudo apt-get update

  run \
    "Installing pipx" \
    sudo apt-get install -y --no-install-recommends pipx
fi


run_shell \
  "Refreshing pipx PATH" \
  'pipx ensurepath --force'

export PATH="$HOME/.local/bin:$PATH"


for pkg in ruff ruff-lsp python-lsp-server; do

  case "$pkg" in
    ruff)
      bin="ruff"
      ;;

    ruff-lsp)
      bin="ruff-lsp"
      ;;

    python-lsp-server)
      bin="pylsp"
      ;;
  esac

  if has "$bin"; then
    skip "$pkg"
  else
    run \
      "Installing $pkg" \
      pipx install "$pkg"
  fi
done


 
section "MARKSMAN"


MARKSMAN="$HOME/.local/bin/marksman"

if [[ -x "$MARKSMAN" ]]; then
  skip "marksman"
else
  mkdir -p "$HOME/.local/bin"

  case "$(uname -m)" in
    x86_64)
      asset="marksman-linux-x64"
      ;;

    aarch64|arm64)
      asset="marksman-linux-arm64"
      ;;

    *)
      die "unsupported architecture for Marksman: $(uname -m)"
      ;;
  esac

  run_shell \
    "Installing Marksman ($asset)" \
    "
      curl -fL \
        --retry 3 \
        --retry-delay 1 \
        -o '$MARKSMAN.tmp' \
        'https://github.com/artempyanykh/marksman/releases/latest/download/$asset' &&
      chmod +x '$MARKSMAN.tmp' &&
      mv '$MARKSMAN.tmp' '$MARKSMAN'
    "
fi

export PATH="$HOME/.local/bin:$PATH"


 
section "TOOLCHAIN LSPs"


# Rust
if has rustup; then

  if has rust-analyzer; then
    skip "rust-analyzer"
  else
    if run_shell \
      "Installing rust-analyzer" \
      'rustup component add rust-analyzer --quiet'
    then
      :
    else
      warn "rust-analyzer could not be installed through rustup"
    fi
  fi

else
  warn "rustup not found — skipping rust-analyzer"
fi


# Go
if has go; then

  export GOBIN="${GOBIN:-$HOME/go/bin}"
  mkdir -p "$GOBIN"
  export PATH="$GOBIN:$PATH"

  if has gopls; then
    skip "gopls"
  else
    run \
      "Installing gopls" \
      go install golang.org/x/tools/gopls@latest
  fi

else
  warn "go not found — skipping gopls"
fi


# clangd
if has clangd; then
  skip "clangd"
else
  warn "clangd not found — install with: sudo apt install clangd"
fi


 
section "VERIFY"


verify_cmd() {
  local cmd="$1"

  if has "$cmd"; then
    ok "$cmd → $(command -v "$cmd")"
  else
    warn "$cmd is not currently visible on PATH"
  fi
}


verify_cmd node
verify_cmd npm
verify_cmd pnpm
verify_cmd opencode
verify_cmd marksman
verify_cmd ruff
verify_cmd pylsp

has ruff-lsp && ok "ruff-lsp → $(command -v ruff-lsp)"
has gopls && ok "gopls → $(command -v gopls)"
has rust-analyzer && ok "rust-analyzer → $(command -v rust-analyzer)"
has clangd && ok "clangd → $(command -v clangd)"


 
# Finish
 

END=$(date +%s)
ELAPSED=$((END - START))

printf '\n'

  "$REVERSE" "$BLACK" "$RESET"

printf '%s%s│%s  %s%sSETUP COMPLETE%s                                      %s│%s\n' \
  "$REVERSE" "$BLACK" \
  "$RESET" \
  "$BLACK" "$BOLD" "$RESET" \
  "$REVERSE" "$RESET"

printf '%s%s│%s  %sElapsed: %ss%s                                             %s│%s\n' \
  "$REVERSE" "$BLACK" \
  "$RESET" \
  "$BRIGHT_BLACK" "$ELAPSED" "$RESET" \
  "$REVERSE" "$RESET"


  "$REVERSE" "$BLACK" "$RESET"

printf '\n'
printf '%sPATH additions in this shell:%s\n' \
  "$BRIGHT_BLACK" "$RESET"

printf '  %s~/.local/bin%s\n' \
  "$DIM" "$RESET"

printf '  %s~/.opencode/bin%s\n' \
  "$DIM" "$RESET"

printf '  %s~/go/bin%s\n' \
  "$DIM" "$RESET"

printf '\n'
printf '%s%sOpen a new terminal after this script so your shell picks up everything permanently.%s\n' \
  "$BRIGHT_BLACK" "$DIM" "$RESET"

printf '\n'
