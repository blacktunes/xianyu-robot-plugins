import axios from 'axios'
import { BotPlugin, NodeMessage } from 'xianyu-robot'
const Jimp = require('jimp')

interface SetuConfig {
  keyword: string
  api: string
  pic_url: string
  r18: 0 | 1 | 2
}

export default class Setu extends BotPlugin {
  name = '随机色图'
  config: SetuConfig = {
    keyword: '#来点色图',
    api: 'https://api.lolicon.app/setu/v2',
    pic_url: '',
    r18: 0
  }

  antiShielding = async (url: string) => {
    this.Bot.Log.logInfo(`开始下载 ${url}`, this.name)
    let res
    try {
      res = await axios.get(!!this.config.pic_url ? url.replace('https://i.pixiv.cat', this.config.pic_url) : url, {
        responseType: 'arraybuffer',
        timeout: 1000 * 20,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      })
    } catch (err) {
      if (err.toJSON) {
        this.Bot.Log.logError(err.toJSON().message, this.name)
      } else {
        console.error(err)
      }
    }

    if (res && res.data) {
      const img = await Jimp.read(Buffer.from(res.data))

      const [w, h] = [img.getWidth(), img.getHeight()]
      const pixels = [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
      ]
      for (const [x, y] of pixels) {
        img.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 1), x, y)
      }

      return 'base64://' + (await img.getBase64Async(Jimp.MIME_PNG)).split(',')[1]
    } else {
      return
    }
  }

  init = () => {
    this.Command
      .command(this.config.keyword)
      .action('group', e => {
        const num = Math.floor(Math.random() * 10) + 1
        axios.get(this.config.api + `?size=small&num=${num}`)
          .then(async res => {
            if (!!res.data.error) {
              this.Bot.Log.logError(res.data.error, this.name)
              this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}发生了奇怪的问题`)
              return
            }

            if (res.data.data.length > 0) {
              const msgNum = this.Bot.Conn.getMessageNum()

              let time = 0
              for (let t = 0; t < res.data.data.length; t++) {
                time += Math.floor(Math.random() * (20 - 10 + 1) + 10)
              }
              this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}${res.data.data.length}张涩图发送中，预计需要${time}秒${msgNum > 0 ? '(消息队列: ' + msgNum + ')' : ''}`)

              const list: NodeMessage[] = []

              for (let i = 0; i < res.data.data.length; i++) {
                const item = res.data.data[i]
                const img = await this.antiShielding(item.urls.small)
                let msg = ''
                if (img) {
                  msg = this.Bot.CQCode.image(img)
                } else {
                  msg = item.urls.small
                }
                list.push(this.Bot.CQCode.customNode(e.sender.card || e.sender.nickname || 'LSP', e.sender.user_id, `${res.data.data.length > 1 ? `[${i + 1}/${res.data.data.length}] ` : ''}${item.title}(P${item.p}) - ${item.author}\n${msg}`))

              }
              const code = await this.Bot.Api.sendGroupForwardMsg(e.group_id, list)

              if (code === 100) {
                this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}好像发送失败了`)
              }
            }
          })
          .catch(err => {
            if (err.toJSON) {
              this.Bot.Log.logError(err.toJSON().message, this.name)
            } else {
              console.error(err)
            }
            this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}发生了奇怪的问题`)
          })
        return true
      })
  }
}