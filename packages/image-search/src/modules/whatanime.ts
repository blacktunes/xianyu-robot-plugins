import axios from 'axios'
import { PrintLog } from 'xianyu-robot'
import { Bot } from 'xianyu-robot/lib/Bot/Bot'

/**
 * 使用whatanime搜图
 * @param {number} group_id 来源群号或讨论组ID
 * @param {number} qq
 * @param {string} msg
 */
export function whatanime(bot: Bot, name: string, group_id: number, qq: number, msg: string, message_id: number) {
  PrintLog.logInfo(`${qq}触发whatanime搜图`, name)
  const imgURL = msg.match(/(?<=url=).*?(?=\])/)[0]
  PrintLog.logInfo(`已获取图片URL`, name)
  bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}好`)
  axios({
    url: 'https://api.trace.moe/search',
    method: 'GET',
    params: {
      url: imgURL
    }
  })
    .then(res => {
      if(res.data.error) {
        PrintLog.logError(res.data.error, name)
        return
      }
      const quota = res.data.quota
      let warnMsg = ''
      if (quota < 20) {
        warnMsg += `\n注意：24h内搜图次数仅剩${quota}次`
      }
      if (res.data.docs && res.data.docs.length > 0) {
        let {
          from,
          to,
          at,
          anilist_id,
          filename,
          tokenthumb,
          // season,
          anime,
          episode,
          similarity
        } = res.data.docs[0]
        similarity = (similarity * 100).toFixed(2)
        if (similarity < 60) {
          warnMsg += `\n相似度过低，如果结果不理想，那么可能：确实找不到此图/图为原图的局部图/图清晰度太低`
        }
        let time = `${timeFormat(from)}~${timeFormat(to)}`
        let thumb = `https://trace.moe/thumbnail.php?anilist_id=${anilist_id}\&file=${filename}&t=${at}&token=${tokenthumb}`
        thumb = encodeURI(thumb.replace('+', ''))
        bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}\n${bot.CQCode.image(thumb)}\n相似度：${similarity}%\n番名：${anime}\n集数：${episode}\n时间：${time}${warnMsg}`)
      } else {
        bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}好像没查到这是啥${warnMsg}`)
      }
    })
    .catch(err => {
      console.error(err.toJSON ? err.toJSON().message : err)
      PrintLog.logError('whatanime查询失败', name)
      bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}出现了奇怪的错误`)
    })
}

/**
 * 将秒数转化为HH:MM:SS格式
 * @param {number} time 秒
 */
function timeFormat(time: number) {
  var h = Math.floor(time / 3600) < 10 ? '0' + Math.floor(time / 3600) : Math.floor(time / 3600)
  var m = Math.floor((time / 60 % 60)) < 10 ? '0' + Math.floor((time / 60 % 60)) : Math.floor((time / 60 % 60))
  var s = Math.floor((time % 60)) < 10 ? '0' + Math.floor((time % 60)) : Math.floor((time % 60))
  return h + ":" + m + ":" + s
}
