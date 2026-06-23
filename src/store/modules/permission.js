import auth from '@/plugins/auth'
import router, { constantRoutes, dynamicRoutes } from '@/router'
import { getRouters } from '@/api/menu'
import Layout from '@/layout/index'
import ParentView from '@/components/ParentView'
import InnerLink from '@/layout/components/InnerLink'

// 匹配views里面所有的.vue文件
const modules = import.meta.glob('./../../views/**/*.vue')

const usePermissionStore = defineStore(
  'permission',
  {
    state: () => ({
      routes: [],
      addRoutes: [],
      defaultRoutes: [],
      topbarRouters: [],
      sidebarRouters: []
    }),
    actions: {
      setRoutes(routes) {
        this.addRoutes = routes
        this.routes = constantRoutes.concat(routes)
      },
      setDefaultRoutes(routes) {
        this.defaultRoutes = constantRoutes.concat(routes)
      },
      setTopbarRoutes(routes) {
        this.topbarRouters = routes
      },
      setSidebarRouters(routes) {
        this.sidebarRouters = routes
      },
      generateRoutes(roles) {
        return new Promise((resolve, reject) => {
          // 向后端请求路由数据
          getRouters().then(res => {
            let data = JSON.parse(JSON.stringify(res.data))
            // 处理菜单结构，将文章管理放到系统管理下，并移除若依官网菜单
            data = adjustMenuStructure(data)
            data = removeMenuItemByTitle(data, '若依官网')
            const sdata = JSON.parse(JSON.stringify(data))
            const rdata = JSON.parse(JSON.stringify(data))
            const defaultData = JSON.parse(JSON.stringify(data))
            const sidebarRoutes = filterAsyncRouter(sdata)
            const rewriteRoutes = filterAsyncRouter(rdata, false, true)
            const defaultRoutes = filterAsyncRouter(defaultData)
            const asyncRoutes = filterDynamicRoutes(dynamicRoutes)
            asyncRoutes.forEach(route => { router.addRoute(route) })
            this.setRoutes(rewriteRoutes)
            this.setSidebarRouters(constantRoutes.concat(sidebarRoutes))
            this.setDefaultRoutes(sidebarRoutes)
            this.setTopbarRoutes(defaultRoutes)
            resolve(rewriteRoutes)
          }).catch(error => {
            console.error('generateRoutes error:', error)
            reject(error)
          })
        })
      }
    }
  })

// 遍历后台传来的路由字符串，转换为组件对象
function filterAsyncRouter(asyncRouterMap, lastRouter = false, type = false) {
  return asyncRouterMap.filter(route => {
    if (type && route.children) {
      route.children = filterChildren(route.children)
    }
    if (route.component) {
      // Layout ParentView 组件特殊处理
      if (route.component === 'Layout') {
        route.component = Layout
      } else if (route.component === 'ParentView') {
        route.component = ParentView
      } else if (route.component === 'InnerLink') {
        route.component = InnerLink
      } else {
        route.component = loadView(route.component)
      }
    }
    if (route.children != null && route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, route, type)
    } else {
      delete route['children']
      delete route['redirect']
    }
    return true
  })
}

function filterChildren(childrenMap, lastRouter = false) {
  var children = []
  childrenMap.forEach(el => {
    el.path = lastRouter ? lastRouter.path + '/' + el.path : el.path
    if (el.children && el.children.length && el.component === 'ParentView') {
      children = children.concat(filterChildren(el.children, el))
    } else {
      children.push(el)
    }
  })
  return children
}

// 动态路由遍历，验证是否具备权限
export function filterDynamicRoutes(routes) {
  const res = []
  routes.forEach(route => {
    if (route.permissions) {
      if (auth.hasPermiOr(route.permissions)) {
        res.push(route)
      }
    } else if (route.roles) {
      if (auth.hasRoleOr(route.roles)) {
        res.push(route)
      }
    }
  })
  return res
}

// 调整菜单结构，将文章管理放到系统管理下
function adjustMenuStructure(menuData) {
  let systemMenu = null
  let articleMenuInfo = null

  // 第一步：找到系统管理菜单
  for (let i = 0; i < menuData.length; i++) {
    if (menuData[i].meta?.title === '系统管理') {
      systemMenu = menuData[i]
      break
    }
  }

  // 第二步：递归查找文章管理菜单
  function findArticleMenu(menus, parent = null) {
    for (let i = 0; i < menus.length; i++) {
      if (menus[i].meta?.title === '文章管理') {
        return {
          menu: menus[i],
          parent,
          index: i,
          container: menus
        }
      }
      if (menus[i].children && menus[i].children.length > 0) {
        const found = findArticleMenu(menus[i].children, menus[i])
        if (found) {
          return found
        }
      }
    }
    return null
  }

  articleMenuInfo = findArticleMenu(menuData)

  if (systemMenu && articleMenuInfo) {
    // 从原位置移除文章管理
    articleMenuInfo.container.splice(articleMenuInfo.index, 1)

    // 添加到系统管理的子菜单中
    if (!systemMenu.children) {
      systemMenu.children = []
    }
    systemMenu.children.push(articleMenuInfo.menu)
  }

  return menuData
}

function removeMenuItemByTitle(menus, title) {
  return menus.filter(menu => {
    if (menu.children && menu.children.length) {
      menu.children = removeMenuItemByTitle(menu.children, title)
    }
    return menu.meta?.title !== title
  })
}

export const loadView = (view) => {
  let res
  for (const path in modules) {
    const dir = path.split('views/')[1].split('.vue')[0]
    if (dir === view) {
      res = () => modules[path]()
    }
  }
  return res
}

export default usePermissionStore
