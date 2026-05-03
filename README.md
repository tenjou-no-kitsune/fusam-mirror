> [!IMPORTANT]
> THIS IS A "MIRROR" WITH URL CHANGES FOR ACCESSIBILITY  
> for licensing, please refer to the [upstream original repository (FUSAM)](https://gitlab.com/Sidiousious/bc-addon-loader)!
>
> this version of the repository exists for those who cannot load from GitLab for whatever reason...

> [!CAUTION]
> if you have no issues accessing [sidiousious.gitlab.io](https://sidiousious.gitlab.io/bc-addon-loader/) please use that instead!  
> this version of FUSAM runs purely on GitHub Pages and depends on me to update it to match upstream

> [!WARNING]
> again... another warning... use this at your own risk, i'm not responsible for any mishap if used improperly  
> my suggestions are to load this through the instructions on [tenjou-no-kitsune.github.io/fusam-mirror](https://tenjou-no-kitsune.github.io/fusam-mirror)

> [!NOTE]  
> this `github-ver` branch serves as a GitHub Pages hosted "mirror" of FUSAM
> 
> FUSAM url change: `sidiousious.gitlab.io/bc-addon-loader` => `tenjou-no-kitsune.github.io/fusam-mirror`
> 
> manifest changes:  
> - WCE: `wce.netlify.app` => `tenjou-no-kitsune.github.io/WCE`

# BC Addon Manager

One stop shop for addon installation for BC.

## Users

This provides you with a single interface to toggle addons developed by the community. [Installation instructions can be found here](https://tenjou-no-kitsune.github.io/fusam-mirror/).

## Developers

For addon developers this means you do not have to include the modding SDK or have your own instructions for users to install your addon; simply point them here.

To get your addon added, either join the [BC Scripting Community Discord](https://discord.gg/SHJMjEh9VH) and ask there or create a merge request for manifest.json. The following information is required:

- short name / ID, alphanumeric
- long name
- short description
- author name
- link to the script

You may optionally also provide:

- link to a source code repository
- link to a website for more information
- additional distributions (beta/dev versions)

### Developing an Addon for FUSAM

You need a [local HTTP server](https://gist.github.com/willurd/5720255) that serves your js file. Open the club and add `?fusam=http://localhost:<your_port>/<your_file>.js&fusamType=<module/script/eval>` replacing the `<placeholders>`, and you will be able to load your development addon as "Local Development by You" inside FUSAM.

### Making changes to FUSAM

You can also serve your dev version of FUSAM by doing the following:

- run `npm run serve`
- open http://localhost:3001/loader.user.js to load in ViolentMonkey/TamperMonker. Either replace the production version or add it as a duplicate (just disable the one you don't use).

### Contributing

If you'd like to see improvements in the loader itself, you can create an issue or discuss in the Discord linked above.
