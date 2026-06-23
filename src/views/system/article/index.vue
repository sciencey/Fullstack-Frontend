<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryForm" :inline="true" label-width="68px">
      <el-form-item label="文章标题" prop="title">
        <el-col><el-input v-model="queryParams.title" placeholder="请输入标题" clearable @keyup.enter="handleQuery"/></el-col>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" size="default" @click="handleQuery">搜索</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain :icon="Plus" size="default" @click="handleAdd" v-hasPermi="['system:article:add']">新增</el-button>
      </el-col>
    </el-row>

    <el-table v-loading="loading" :data="articleList">
      <el-table-column label="文章ID" align="center" prop="articleId" />
      <el-table-column label="文章标题" align="center" prop="title" />
      <el-table-column label="文章内容" align="center" prop="content" :show-overflow-tooltip="true" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'">
            {{ row.status === '1' ? '已发布' : '草稿' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建者" align="center" prop="createBy" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="{ row }">
          <el-button size="small" type="primary" link :icon="Edit" @click="handleUpdate(row)" v-hasPermi="['system:article:edit']">修改</el-button>
          <el-button size="small" type="danger" link :icon="Delete" @click="handleDelete(row)" v-hasPermi="['system:article:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total>0" :total="total" :page="queryParams.pageNum" :limit="queryParams.pageSize" @pagination="handlePageChange" />

    <el-dialog :title="title" v-model:visible="open" width="500px" append-to-body @close="cancel">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="文章标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入文章标题" />
        </el-form-item>
        <el-form-item label="文章内容" prop="content">
          <el-input v-model="form.content" type="textarea" placeholder="请输入内容" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="0">草稿</el-radio>
            <el-radio label="1">发布</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { listArticle, getArticle, delArticle, addArticle, updateArticle } from "@/api/system/article"

const loading = ref(true)
const total = ref(0)
const articleList = ref([])
const title = ref("")
const open = ref(false)
const formRef = ref(null)
const queryParams = reactive({ pageNum: 1, pageSize: 10, title: null, status: null })
const form = reactive({ articleId: null, title: null, content: null, status: "0" })
const rules = {
  title: [{ required: true, message: "文章标题不能为空", trigger: "blur" }]
}

const getList = () => {
  loading.value = true
  listArticle(queryParams).then(response => {
    articleList.value = response.rows
    total.value = response.total
    loading.value = false
  }).catch(() => {
    loading.value = false
  })
}

const cancel = () => {
  open.value = false
  reset()
}

const reset = () => {
  form.articleId = null
  form.title = null
  form.content = null
  form.status = "0"
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

const handleQuery = () => {
  queryParams.pageNum = 1
  getList()
}

const handleAdd = () => {
  reset()
  open.value = true
  title.value = "添加文章"
}

const handleUpdate = (row) => {
  reset()
  getArticle(row.articleId).then(response => {
    form.articleId = response.data.articleId
    form.title = response.data.title
    form.content = response.data.content
    form.status = response.data.status
    open.value = true
    title.value = "修改文章"
  })
}

const submitForm = () => {
  formRef.value.validate(valid => {
    if (valid) {
      if (form.articleId != null) {
        updateArticle(form).then(response => {
          ElMessage.success("修改成功")
          open.value = false
          getList()
        })
      } else {
        addArticle(form).then(response => {
          ElMessage.success("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

const handleDelete = (row) => {
  ElMessageBox.confirm(`是否确认删除文章编号为"${row.articleId}"的数据项？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    return delArticle(row.articleId)
  }).then(() => {
    ElMessage.success("删除成功")
    getList()
  }).catch(() => {})
}

const handlePageChange = (page) => {
  queryParams.pageNum = page.page
  queryParams.pageSize = page.limit
  getList()
}

onMounted(() => {
  getList()
})
</script>