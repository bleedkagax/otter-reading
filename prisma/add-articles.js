// Script to add additional IELTS articles
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function addArticles() {
  console.log('🌱 Adding additional IELTS articles...')
  
  const prisma = new PrismaClient()
  
  try {
    // First, delete any existing articles with the IDs article1-article5
    console.log('Cleaning up any existing articles...')
    const articleIds = ['article1', 'article2', 'article3', 'article4', 'article5']
    
    // Delete questions first due to foreign key constraints
    for (const articleId of articleIds) {
      await prisma.ieltsQuestion.deleteMany({
        where: { passageId: articleId }
      })
    }
    
    // Then delete articles
    await prisma.ieltsPassage.deleteMany({
      where: { id: { in: articleIds } }
    })
    
    console.log('Existing articles cleaned up.')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'sql', 'articles.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .filter(statement => statement.trim().length > 0)
    
    // Execute each statement
    console.log('Adding new articles...')
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(`${statement};`)
    }
    
    console.log('✅ Successfully added new IELTS articles and questions!')
  } catch (error) {
    console.error('Error adding articles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addArticles() 