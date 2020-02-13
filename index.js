const path = require('path')
const webExt = require('web-ext').default
const { print } = require('@ianwalter/print')

const pluginName = 'WebExtWebpackPlugin'

class WebExtWebpackPlugin {
  constructor ({
    sourceDir = process.cwd(),
    artifactsDir = path.join(sourceDir, 'dist'),
    lint = {
      artifactsDir,
      boring: false,
      metadata: false,
      output: 'text',
      pretty: false,
      sourceDir,
      verbose: false,
      warningsAsErrors: true
    },
    ...rest
  } = {}) {
    this.runner = null
    this.watchMode = false
    this.options = { sourceDir, artifactsDir, ...rest }
    this.lintOptions = lint
  }

  apply (compiler) {
    const watchRun = async compiler => {
      this.watchMode = true
    }

    const afterEmit = async compilation => {
      try {
        await webExt.cmd.lint(this.lintOptions, { shouldExitProgram: false })

        if (!this.watchMode) {
          return
        }

        if (this.runner) {
          this.runner.reloadAllExtensions()
          return
        }

        await webExt.cmd.run(this.options, {}).then(r => (this.runner = r))

        if (!this.runner) {
          return
        }

        this.runner.registerCleanup(() => (this.runner = null))
      } catch (err) {
        print.err(err)
      }
    }

    if (compiler.hooks) {
      compiler.hooks.afterEmit.tapPromise({ name: pluginName }, afterEmit)
      compiler.hooks.watchRun.tapPromise({ name: pluginName }, watchRun)
    } else {
      compiler.plugin('afterEmit', afterEmit)
      compiler.plugin('watchRun', watchRun)
    }
  }
}

module.exports = WebExtWebpackPlugin
