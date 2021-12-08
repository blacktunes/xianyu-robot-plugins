import { BotPlugin } from 'xianyu-robot'
import NamedRegExp = require('named-regexp-groups')

const imgFuduReg = new NamedRegExp('file=(?<img>.*),.*')
const imgReg = new NamedRegExp('(\\[CQ:image).*(/0\\?term=2)')

export default class Fudu extends BotPlugin {
  name = '复读'

  msgList: {
    [group_id: number]: {
      qq: number
      msg: string
      num: number
    }
  } = {}

  init = () => {
    this.Bot.Event.onSendMessage('sendGroupMsg', (group_id, message) => {
      if (this.msgList[group_id] && this.msgList[group_id].msg !== message) {
        delete this.msgList[group_id]
      }
    })
    this.Bot.Event.on('message.group', e => {
      if (Object.keys(this.msgList).includes(`${e.group_id}`)) {
        if (this.msgList[e.group_id].msg === e.message || ((imgReg.test(this.msgList[e.group_id].msg) && imgReg.test(e.message)) && (imgFuduReg.exec(this.msgList[e.group_id].msg).groups.img === imgFuduReg.exec(e.message).groups.img))) {
          if (this.msgList[e.group_id].qq !== e.sender.user_id) {
            this.msgList[e.group_id].num += 1
          }
          if (this.msgList[e.group_id].num === 2) {
            this.msgList[e.group_id].num += 1
            this.Bot.Api.sendGroupMsg(e.group_id, e.message)
            return
          } else {
            return
          }
        }
      }

      if (this.Bot.Command.list.some(item => {
        return item.comm.includes(e.message) || (item.reg && item.reg.test(e.message))
      })) return

      this.msgList[e.group_id] = {
        qq: e.sender.user_id,
        msg: e.message,
        num: 1
      }
    })
  }
}
