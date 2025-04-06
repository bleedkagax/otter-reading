import { useLoaderData } from 'react-router'
import { requireUserId } from '#app/utils/auth.server'
import { prisma } from '#app/utils/db.server'
import { PassageReader } from '#app/components/ielts/PassageReader'
import { json, type LoaderFunctionArgs } from '#app/utils/router-helpers'

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireUserId(request)
  
  const passageId = params.passageId
  if (!passageId) throw new Response('需要指定文章ID', { status: 400 })
  
  const passage = await prisma.ieltsPassage.findUnique({
    where: { id: passageId },
  })
  
  if (!passage) throw new Response('文章不存在', { status: 404 })
  
  return json({ passage })
}

export default function ReadPassage() {
  const { passage } = useLoaderData<typeof loader>()
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <PassageReader passage={passage} showTitle={true} />
    </div>
  )
} 