import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

// 递归地将 $ref 引用替换为实际的 schema 内容
function resolveRefs(obj: any, schemas: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, schemas));
  }

  if (obj['$ref']) {
    const refPath = obj['$ref'];
    const schemaName = refPath.replace('#/components/schemas/', '');
    if (schemas[schemaName]) {
      return resolveRefs(schemas[schemaName], schemas);
    }
    return obj;
  }

  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key] = resolveRefs(obj[key], schemas);
    }
  }
  return result;
}

async function generateSwaggerDoc() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('OKR绩效考核系统API')
    .setDescription('OKR绩效考核系统后端API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 确保docs目录存在
  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // 创建内联版本的文档（将所有$ref替换为实际内容）
  const inlineDocument = JSON.parse(JSON.stringify(document));
  const schemas = inlineDocument.components?.schemas || {};
  
  // 递归替换paths中的所有$ref
  if (inlineDocument.paths) {
    inlineDocument.paths = resolveRefs(inlineDocument.paths, schemas);
  }

  // 导出原始JSON格式（包含$ref）
  fs.writeFileSync(
    path.join(docsDir, 'swagger.json'),
    JSON.stringify(document, null, 2)
  );

  // 导出内联JSON格式（不包含$ref）
  fs.writeFileSync(
    path.join(docsDir, 'swagger-inline.json'),
    JSON.stringify(inlineDocument, null, 2)
  );

  // 导出YAML格式
  const yaml = require('js-yaml');
  fs.writeFileSync(
    path.join(docsDir, 'swagger.yaml'),
    yaml.dump(document)
  );

  // 导出内联YAML格式
  fs.writeFileSync(
    path.join(docsDir, 'swagger-inline.yaml'),
    yaml.dump(inlineDocument)
  );

  console.log('✅ Swagger文档已导出到 docs/ 目录');
  console.log('📄 JSON格式（带引用）: docs/swagger.json');
  console.log('📄 JSON格式（内联）: docs/swagger-inline.json');
  console.log('📄 YAML格式（带引用）: docs/swagger.yaml');
  console.log('📄 YAML格式（内联）: docs/swagger-inline.yaml');

  await app.close();
}

generateSwaggerDoc().catch(console.error);