# How to

## How to build and test extension

- Add extension / Remix from GitHub
- (Optional) ``` npm install -g @airtable/blocks-cli ```
- ``` block init <app/block> --template=https://github.com/my-serious-game/airtable-flow-chart custom_flowchart ```
- ``` cd custom_flowchart ```
- ``` block run ```

## How to build and release extension

- ```block init <app/block> custom_flowchart```
- ```cd custom_flowchart```
- ```block release --remote <remote_name>```
