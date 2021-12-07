import axios from 'axios'
import { PrintLog } from 'xianyu-robot'
import { Bot } from 'xianyu-robot/lib/Bot/Bot'

// 只显示P站、动画、电影结果
// var whiteList = [5, 21, 23]

/**
 * 使用saucenao搜图
 * @param type 发送类型, 2为讨论组, 1为群
 * @param {number} group_id 来源群号或讨论组ID
 * @param {number} qq
 * @param {string} msg
 */
export function saucenao(bot: Bot, name: string, group_id: number, qq: number, msg: string, message_id: number, saucenaoApiKey: string): void {
  PrintLog.logInfo(`${qq}触发saucenao搜图`, name)
  const imgURL = msg.match(/(?<=url=).*?(?=\])/)[0]
  bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}好`)
  PrintLog.logInfo(`已获取图片URL`, name)
  const params = {
    db: 999,
    output_type: 2,
    numres: 1,
    url: imgURL
  }
  if (saucenaoApiKey) {
    params['api_key'] = saucenaoApiKey
  }
  axios({
    url: 'https://saucenao.com/search.php',
    method: 'GET',
    params
  })
    .then((res: any) => {
      const {
        header: {
          // short_remaining,
          long_remaining
        }
      } = res.data
      let warnMsg = ''
      if (long_remaining < 20) {
        warnMsg += `\n\n注意：24h内搜图次数仅剩${long_remaining}次`
      }

      if (res.data.results && res.data.results.length > 0) {
        const {
          header: {
            similarity, // 相似度
            thumbnail // 缩略图
          }
        } = res.data.results[0]

        if (similarity < 50) {
          warnMsg += `\n\n相似度过低，搜索指南：\n1.请勿使用局部图或多图拼接，这样大概率不会出现正确结果\n2.请再看一次第一点，还是搜不到就是搜不到\n3.请再看一次第二点，滥用可能会导致永久封禁`
        }

        const msg = `${bot.CQCode.reply(message_id)}\n${bot.CQCode.image(thumbnail)}\n相似度：${similarity}%\n`
        const data = res.data.results[0].data
        const url = data.ext_urls && data.ext_urls.length > 0 ? `\n${data.ext_urls[0]}` : ''

        if (data.jp_name || data.eng_name) {
          bot.Api.sendGroupMsg(group_id, `${msg}JP: ${data.jp_name}\nEN: ${data.eng_name}${warnMsg}`)
          return
        }

        if (data.pixiv_id) {
          bot.Api.sendGroupMsg(group_id, `${msg}title：${data.title}\nauthor：${data.member_name}\npid：${data.pixiv_id}${url}${warnMsg}`)
          return
        }

        if (data.est_time) {
          bot.Api.sendGroupMsg(group_id, `${msg}番名：${data.source}\n集数：${data.part}\n时间：${data.est_time}${url}${warnMsg}`)
          return
        }

        bot.Api.sendGroupMsg(group_id, `${msg}可能结果：${data.title ? '\ntitle: ' + data.title : ''}${data.author_name ? '\nauthor: ' + data.author_name : ''}${data.source ? '\nsource: ' + data.source : ''}${url}${warnMsg}`)
      } else {
        bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}好像没查到这是啥${warnMsg}`)
      }
    })
    .catch(err => {
      console.error(err.toJSON ? `ERROR: ${err.toJSON().message}` : err)
      PrintLog.logError('saucenao查询失败', name)
      bot.Api.sendGroupMsg(group_id, `${bot.CQCode.reply(message_id)}出现了奇怪的错误`)
    })
}
