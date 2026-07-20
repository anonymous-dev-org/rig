############################################################
# Locale & editors
############################################################
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export EDITOR="code --wait"
export VISUAL="$EDITOR"
export PATH="$HOME/.local/bin:$PATH"

if command -v brew >/dev/null 2>&1; then
  export HOMEBREW_PREFIX="${HOMEBREW_PREFIX:-$(brew --prefix 2>/dev/null)}"
elif [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi

############################################################
# History & shell behavior
############################################################
export HISTFILE="$HOME/.zsh_history"
HISTSIZE=20000
SAVEHIST=20000
setopt hist_ignore_all_dups share_history inc_append_history extended_history
setopt autocd nocaseglob interactivecomments no_beep prompt_subst

############################################################
# Minimal plugin bootstrap
############################################################
ZSH_PLUGIN_DIR="$HOME/.zsh/plugins"
mkdir -p "$ZSH_PLUGIN_DIR"

_clone_plugin_if_missing() {
  local repo="$1" dest="$2"
  [[ -d "$dest/.git" ]] && return
  git clone --depth=1 "$repo" "$dest" >/dev/null 2>&1 || true
}

_update_plugin() {
  local repo="$1" dest="$2"
  if [[ -d "$dest/.git" ]]; then
    git -C "$dest" pull --ff-only >/dev/null 2>&1 || true
    return
  fi
  git clone --depth=1 "$repo" "$dest" >/dev/null 2>&1 || true
}

AUTOCOMPLETE_REPO="https://github.com/marlonrichert/zsh-autocomplete.git"
HIGHLIGHT_REPO="https://github.com/zsh-users/zsh-syntax-highlighting.git"
AUTOCOMPLETE_DIR="$ZSH_PLUGIN_DIR/zsh-autocomplete"
HIGHLIGHT_DIR="$ZSH_PLUGIN_DIR/zsh-syntax-highlighting"
_clone_plugin_if_missing "$AUTOCOMPLETE_REPO" "$AUTOCOMPLETE_DIR"
_clone_plugin_if_missing "$HIGHLIGHT_REPO" "$HIGHLIGHT_DIR"

zsh_plugins_update() {
  _update_plugin "$AUTOCOMPLETE_REPO" "$AUTOCOMPLETE_DIR"
  _update_plugin "$HIGHLIGHT_REPO" "$HIGHLIGHT_DIR"
}

############################################################
# Completion system
############################################################
if [[ -n ${HOMEBREW_PREFIX:-} && -d "$HOMEBREW_PREFIX/share/zsh/site-functions" ]]; then
  fpath=("$HOMEBREW_PREFIX/share/zsh/site-functions" $fpath)
fi

ZSH_CACHE_DIR="$HOME/.zsh/cache"
mkdir -p "$ZSH_CACHE_DIR"
zstyle '*:compinit' arguments -C

############################################################
# Live autocomplete dropdown (must be set BEFORE sourcing)
############################################################
zstyle ':autocomplete:*' min-input 1
zstyle ':autocomplete:*' delay 0.05
zstyle -e ':autocomplete:*:*' list-lines 'reply=( $(( LINES / 3 )) )'
zstyle ':autocomplete:*' async yes

if [[ -r "$AUTOCOMPLETE_DIR/zsh-autocomplete.plugin.zsh" ]]; then
  source "$AUTOCOMPLETE_DIR/zsh-autocomplete.plugin.zsh"
else
  autoload -Uz compinit
  compinit -C -d "$ZSH_CACHE_DIR/.zcompdump"
fi

zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}'
[[ -n ${LS_COLORS:-} ]] && zstyle ':completion:*' list-colors ${(s.:.)LS_COLORS}
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path "$ZSH_CACHE_DIR"

############################################################
# Completion keybindings
############################################################
# Tab accepts inline completion; arrows navigate menu entries
bindkey '^I' complete-word
bindkey '^[[B' down-line-or-select
bindkey '^[OB' down-line-or-select
bindkey '^[[A' up-line-or-search
bindkey '^[OA' up-line-or-search
bindkey -M menuselect '^[[B' down-line-or-history
bindkey -M menuselect '^[OB' down-line-or-history
bindkey -M menuselect '^[[A' up-line-or-history
bindkey -M menuselect '^[OA' up-line-or-history

############################################################
# Syntax highlighting (keep color customizations)
############################################################
source "$HIGHLIGHT_DIR/zsh-syntax-highlighting.zsh"
typeset -A ZSH_HIGHLIGHT_STYLES

ZSH_HIGHLIGHT_STYLES[command]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[alias]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[builtin]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[function]='fg=green,bold'
ZSH_HIGHLIGHT_STYLES[unknown-token]='fg=red,bold'
ZSH_HIGHLIGHT_STYLES[path]='none'
ZSH_HIGHLIGHT_STYLES[path_prefix]='none'
ZSH_HIGHLIGHT_STYLES[single-quoted-argument]='none'
ZSH_HIGHLIGHT_STYLES[double-quoted-argument]='none'
ZSH_HIGHLIGHT_STYLES[single-hyphen-option]='none'
ZSH_HIGHLIGHT_STYLES[double-hyphen-option]='none'
ZSH_HIGHLIGHT_STYLES[globbing]='none'

############################################################
# Prompt (simple example)
############################################################
PROMPT='%F{240}%~%f %F{green}%#%f '
RPROMPT='%(?..%F{red}%?%f)'

############################################################
# Cursor: solid block
############################################################
printf '\e[2 q'


alias b=bun
alias bb='bun run'
alias supa='supabase'
alias n='nvim'
alias nt='nvim +term'
alias claude='caffeinate -i claude'
alias codex='caffeinate -i codex'
alias pi='caffeinate -i pi'
# Cursor CLI installs as cursor-agent; expose its shorter command too.
if command -v cursor-agent &>/dev/null && ! command -v agent &>/dev/null; then
  alias agent='cursor-agent'
fi

alias ai='nvim "+lua require(\"agentic\").toggle()"'
###

[[ -f "$HOME/.zsh/functions.zsh" ]] && source "$HOME/.zsh/functions.zsh"

export NVM_DIR="$HOME/.nvm"

_nvm_load() {
  [[ -n "$_NVM_LOADING" ]] && return
  _NVM_LOADING=1
  unset -f nvm node npm npx 2>/dev/null
  if [[ -n ${HOMEBREW_PREFIX:-} ]]; then
    [ -s "$HOMEBREW_PREFIX/opt/nvm/nvm.sh" ] && \. "$HOMEBREW_PREFIX/opt/nvm/nvm.sh"
    [ -s "$HOMEBREW_PREFIX/opt/nvm/etc/bash_completion.d/nvm" ] && \. "$HOMEBREW_PREFIX/opt/nvm/etc/bash_completion.d/nvm"
  fi
  unset _NVM_LOADING
}

nvm()  { _nvm_load; nvm "$@"; }
node() { _nvm_load; command node "$@"; }
npm()  { _nvm_load; command npm "$@"; }
npx()  { _nvm_load; command npx "$@"; }

# goenv lazy setup
export GOENV_ROOT="$HOME/.goenv"

_lazy_load_goenv() {
  unset -f goenv go gofmt
  [[ -d "$GOENV_ROOT" ]] || return
  export PATH="$GOENV_ROOT/bin:$GOENV_ROOT/shims:$PATH"
  export GOENV_PATH_ORDER=front
  command -v goenv >/dev/null 2>&1 || return
  eval "$(goenv init - --no-rehash)" >/dev/null 2>&1 || true
}

goenv() {
  _lazy_load_goenv
  goenv "$@"
}

go() {
  _lazy_load_goenv
  go "$@"
}

gofmt() {
  _lazy_load_goenv
  gofmt "$@"
}
if [[ -n ${HOMEBREW_PREFIX:-} && -d "$HOMEBREW_PREFIX/opt/libpq/bin" ]]; then
  export PATH="$HOMEBREW_PREFIX/opt/libpq/bin:$PATH"
fi

# Machine-specific overrides (not tracked in repo)
[[ -f ~/.zshrc.local ]] && source ~/.zshrc.local || true
