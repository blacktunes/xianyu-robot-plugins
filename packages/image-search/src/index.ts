import { BotPlugin } from 'xianyu-robot'
import { saucenao } from './modules/saucenao'
import { whatanime } from './modules/whatanime'

interface SearchPicConfig {
  saucenaoApiKey: string
}

export default class SearchPic extends BotPlugin {
  name = '搜图'
  config: SearchPicConfig = {
    saucenaoApiKey: ''
  }

  init = () => {
    this.Command
      .command('#sn')
      .desc('使用saucenao搜图')
      .action('group', e => {
        this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}亮图吧`)
        e.nextMessage((msg, _e) => {
          if (msg === '#sn') {
            this.Bot.Api.sendGroupMsg(_e.group_id, `${this.Bot.CQCode.reply(_e.message_id)}?`)
            return true
          }
          if (/(?<=url=).*?(?=\])/.test(msg)) {
            saucenao(this.Bot, this.name, _e.group_id, _e.sender.user_id, _e.message, _e.message_id, this.config.saucenaoApiKey)
          } else {
            this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}不搜算了`)
          }
        })
        return true
      })

    this.Command
      .command('#wa')
      .desc('使用whatanime搜图')
      .action('group', e => {
        this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}亮图吧`)
        e.nextMessage((msg, _e) => {
          if (msg === '#wa') {
            this.Bot.Api.sendGroupMsg(_e.group_id, `${this.Bot.CQCode.reply(_e.message_id)}?`)
            return true
          }
          if (/(?<=url=).*?(?=\])/.test(msg)) {
            whatanime(this.Bot, this.name, _e.group_id, _e.sender.user_id, _e.message, _e.message_id)
          } else {
            this.Bot.Api.sendGroupMsg(e.group_id, `${this.Bot.CQCode.reply(e.message_id)}不搜算了`)
          }
        })
        return true
      })
  }
}
