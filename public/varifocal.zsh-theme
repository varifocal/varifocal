# varifocal.zsh-theme
#
# Active:
#    panel · git:(main)  ❯
#
# After Enter:
#   panel ❯ git status

# Set VARIFOCAL_SHOW_USER=0 to hide the username segment.

autoload -Uz add-zsh-hook vcs_info

setopt prompt_subst

# ─────────────────────────────────────────────
# Git
# ─────────────────────────────────────────────

zstyle ':vcs_info:git:*' formats '%b'
zstyle ':vcs_info:git:*' actionformats '%b|%a'

varifocal_precmd() {
    vcs_info
}

add-zsh-hook precmd varifocal_precmd


# ─────────────────────────────────────────────
# Colors — grayscale only
# ─────────────────────────────────────────────

local M3_DARK='%F{238}'
local M3_TEXT='%F{255}'

local M3_GIT_SURFACE='%K{244}'
local M3_GIT_TEXT='%F{232}'

local RESET='%f%k'

# ─────────────────────────────────────────────
# Root pill — white surface, inverted (dark) text
#
# Gray pill for a normal user, white pill for root, so the
# two are impossible to confuse at a glance.
# ─────────────────────────────────────────────

varifocal_is_root() {
    [[ $EUID -eq 0 ]]
}

varifocal_pill_colors() {
    if varifocal_is_root; then
        M3_PILL_CAP='%F{255}'
        M3_PILL_SURFACE='%K{255}'
        M3_PILL_TEXT='%F{232}'
    else
        M3_PILL_CAP='%F{238}'
        M3_PILL_SURFACE='%K{238}'
        M3_PILL_TEXT='%F{255}'
    fi
}

varifocal_pill_colors

# Show the username next to the directory name. Set to 0 to hide it.
: ${VARIFOCAL_SHOW_USER:=1}


# ─────────────────────────────────────────────
# Active prompt
# ─────────────────────────────────────────────

varifocal_active_prompt() {
    local dir='%1~'
    local git=''
    local user=''

    varifocal_pill_colors

    [[ "$VARIFOCAL_SHOW_USER" == "1" ]] && user='%n · '

    if [[ -n "$vcs_info_msg_0_" ]]; then
        git=" · 󰊢 ${vcs_info_msg_0_}"
    fi

    print -r -- \
        "${M3_PILL_CAP}${M3_PILL_SURFACE}${M3_PILL_TEXT} ${user}${dir}${git} ${RESET}${M3_PILL_CAP}${RESET} ❯ "
}


# ─────────────────────────────────────────────
# Transient / history prompt
# ─────────────────────────────────────────────

varifocal_transient_prompt() {
    local dir='%1~'
    local user=''
    [[ "$VARIFOCAL_SHOW_USER" == "1" ]] && user='%n · '

    PROMPT="${M3_TEXT}${user}${dir} ${M3_DARK}❯${RESET} "
    RPROMPT=''
}


# ─────────────────────────────────────────────
# Enter key
#
# We change the prompt while ZLE is still active,
# redraw it, then let zsh execute the command.
# ─────────────────────────────────────────────

varifocal_accept_line() {
    local old_prompt="$PROMPT"
    local old_rprompt="$RPROMPT"

    varifocal_transient_prompt

    zle reset-prompt

    PROMPT="$old_prompt"
    RPROMPT="$old_rprompt"

    zle accept-line
}

zle -N varifocal_accept_line

# Enter / Return
bindkey '^M' varifocal_accept_line
bindkey '^J' varifocal_accept_line


# ─────────────────────────────────────────────
# Main prompt
# ─────────────────────────────────────────────

PROMPT='$(varifocal_active_prompt)'
RPROMPT=''

