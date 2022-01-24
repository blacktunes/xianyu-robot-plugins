import axios from 'axios'
import { BotPlugin, PrintLog } from 'xianyu-robot'
import puppeteer = require('puppeteer')
import colors = require('colors')
import schedule = require('node-schedule')
import fs = require('fs-extra')
import path = require('path')

interface MonitorConfig {
  path: string

  list: {
    [id: string]: {
      name: string
      list: {
        id: number
        qq?: number
      }[]
    }
  }
}

/**
 * 动态监控
 */
export default class Live extends BotPlugin {
  name = '监控室'
  config: MonitorConfig = {
    path: path.join(__dirname, 'dynamic'),
    list: {}
  }

  getDynamicId = (id: string | number) => {
    return new Promise<any>((resolve, reject) => {
      axios.get(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?host_uid=${id}`, {
        timeout: 1000 * 55
      })
        .then(res => {
          try {
            const dynamicId = res.data.data.cards[0].desc.dynamic_id_str
            resolve(dynamicId)
          } catch (e) {
            reject('UID可能不正确')
          }
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  savePic = async (name: string, dynamic_id_str: string | number, path: string) => {
    fs.ensureDirSync(this.config.path)
    return new Promise<void>(async (resolve, reject) => {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox']
      })
      const page = await browser.newPage()
      await page.setViewport({
        width: 2560,
        height: 1440
      })
      let times = 0
      let form: puppeteer.ElementHandle<Element>
      const get = async () => {
        const res = await page.goto(`https://t.bilibili.com/${dynamic_id_str}`, {
          waitUntil: 'networkidle0'
        })
        if (!res.ok()) {
          ++times
          if (times >= 5) {
            reject()
            return
          }
          await get()
        }
        form = await page.mainFrame().$('div[class="card"]')
      }
      await get()
      if (form) {
        form.$eval('div[class="panel-area"]', element => {
          element.remove()
        })
        await form.screenshot({
          path: `${path}/${name}-${dynamic_id_str}.png`
        })
        PrintLog.logInfo(`动态图片 ${colors.cyan(`${name}-${dynamic_id_str}.png`)} 已下载`, this.name)
      }
      await page.close()
      await browser.close()
      resolve()
    })
  }

  init = async () => {
    const config = this.Bot.Plugin.getConfig<MonitorConfig>(this.name)
    const watchList = config.list
    for (let key in watchList) {
      PrintLog.logInfo(`开始监听 ${colors.cyan(watchList[key].name)} 的动态`, this.name)

      this.getDynamicId(key)
        .then(id => {
          watchList[key]['dynamic_id_str'] = id
        }, () => { })
        .finally(() => {
          schedule.scheduleJob(key, '0 * * * * *', () => {
            this.getDynamicId(key)
              .then(async dynamic_id_str => {
                if (watchList[key]['dynamic_id_str'] !== dynamic_id_str && !fs.existsSync(`${config.path}/${watchList[key].name}-${dynamic_id_str}.png`)) {
                  this.savePic(watchList[key].name, dynamic_id_str, config.path)
                    .then(() => {
                      watchList[key]['dynamic_id_str'] = dynamic_id_str
                      watchList[key].list.forEach(item => {
                        this.Bot.Api.sendGroupMsg(item.id, `${item.qq ? this.Bot.CQCode.at(item.qq) + '\n' : ''}${watchList[key].name}有新的动态\n${this.Bot.CQCode.image(`file:///${config.path}/${watchList[key].name}-${dynamic_id_str}.png`)}\nhttps://t.bilibili.com/${dynamic_id_str}`)
                      })
                    })
                    .catch(() => {
                      PrintLog.logError('动态图片下载失败', this.name)
                    })
                }
              })
              .catch(err => {
                PrintLog.logError(`动态轮询异常 - ${err.code || err}`, this.name)
              })
          })
        })
    }
  }
}
