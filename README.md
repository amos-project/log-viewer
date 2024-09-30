<img src="src/assets/img/icon-128.png" width="64"/>

# Chrome Json View Extension

## Usage

### Install

1. Download the zip file from release.
2. Unzip it to a directory.
3. Enable developer mode in <chrome://extensions>.
4. Load the directory with Load unpacked button.

### Automation

CJV will auto open trigger `cc` shortcut if the current page's content type is resource, e.g., yaml, js, css.

Note: there is no option to disable it at this moment.

### Context menu

CJV also has options to trigger shortcuts in context menu `JSON`, except for `pp`.

### Shortcuts

- `vv`: pretty print json, auto break lines in string, read from selection or current dom node.
- `pp`: pretty print json, read from clipboard.
- `cc`: pretty print current page's source code with prettier & shiki.
- `hh`: pretty print current page's current html with monaco & shiki.
- `xx`: pretty print current page's text content with ansi colors.

## Dev

1. Clone the repo:

    ```bash
    git clone https://github.com/MoeGolibrary/chrome-extension-json-dom-node.git
    ```

2. Install dependencies:

    ````bash
    pnpm i
    ````

3. Start dev server:

    ```bash
    pnpm start
    ```

4. Build

   ```bash
   pnpm build
   # or, generate all
   ./build.sh
   ```
