import { faker } from '@faker-js/faker'
import { prisma } from '#app/utils/db.server.ts'
import { MOCK_CODE_GITHUB } from '#app/utils/providers/constants'
import {
	createPassword,
	createUser,
	getNoteImages,
	getUserImages,
} from '#tests/db-utils.ts'
import { insertGitHubUser } from '#tests/mocks/github.ts'

// 添加雅思阅读文章的种子数据函数
async function seedIeltsData() {
	console.log('🌱 Seeding IELTS data...')

	// 创建雅思阅读文章
	const passages = [
		{
			title: 'The Impact of Climate Change on Coral Reefs',
			content: `Coral reefs, often referred to as the "rainforests of the sea," are among the most diverse and valuable ecosystems on Earth. They provide habitats for a wide variety of marine organisms and protect coastlines from storms and erosion. However, these delicate ecosystems are under severe threat from climate change and other human-induced stressors.

Rising sea temperatures, primarily caused by global warming, lead to coral bleaching—a process where corals expel the symbiotic algae living in their tissues, causing them to turn completely white. Without these algae, which provide corals with nutrients and their vibrant colors, corals often die from starvation, disease, or other stressors.

Ocean acidification, another consequence of increased carbon dioxide in the atmosphere, reduces the ability of coral organisms to form their calcium carbonate skeletons. This makes it harder for them to grow and recover from disturbances. According to recent studies, if current trends continue, over 90% of coral reefs may be threatened by 2050.

Conservation efforts are underway globally to protect these vital ecosystems. Marine protected areas, reduced coastal pollution, and sustainable fishing practices are some of the management strategies being implemented. Additionally, innovative approaches such as coral restoration projects and assisted evolution research aim to enhance coral resilience to changing conditions.

However, scientists emphasize that the most effective way to protect coral reefs in the long term is to address the root cause: reducing greenhouse gas emissions to mitigate climate change impacts. Without significant action to curb global warming, coral reefs as we know them may cease to exist by the end of this century.`,
			difficulty: 'medium',
			topic: 'Environment',
			wordCount: 250,
			source: 'Academic Journal',
			questions: [
				{
					type: 'true-false-ng',
					questionText: 'Coral bleaching is primarily caused by ocean pollution.',
					options: null,
					correctAnswer: 'FALSE',
					explanation: 'According to the passage, coral bleaching is primarily caused by rising sea temperatures due to global warming, not ocean pollution.',
					points: 1,
					orderIndex: 1
				},
				{
					type: 'true-false-ng',
					questionText: 'Over 90% of coral reefs may be threatened by 2050 if current trends continue.',
					options: null,
					correctAnswer: 'TRUE',
					explanation: 'The passage states: "According to recent studies, if current trends continue, over 90% of coral reefs may be threatened by 2050."',
					points: 1,
					orderIndex: 2
				},
				{
					type: 'multiple-choice',
					questionText: 'Which of the following is described as the most effective way to protect coral reefs in the long term?',
					options: JSON.stringify([
						'Creating marine protected areas',
						'Implementing coral restoration projects',
						'Reducing greenhouse gas emissions',
						'Developing sustainable fishing practices'
					]),
					correctAnswer: 'Reducing greenhouse gas emissions',
					explanation: 'The passage states: "scientists emphasize that the most effective way to protect coral reefs in the long term is to address the root cause: reducing greenhouse gas emissions to mitigate climate change impacts."',
					points: 1,
					orderIndex: 3
				},
				{
					type: 'multiple-choice',
					questionText: 'What does ocean acidification affect in coral organisms?',
					options: JSON.stringify([
						'Their ability to photosynthesize',
						'Their ability to form calcium carbonate skeletons',
						'Their ability to attract symbiotic algae',
						'Their ability to reproduce'
					]),
					correctAnswer: 'Their ability to form calcium carbonate skeletons',
					explanation: 'The passage states: "Ocean acidification, another consequence of increased carbon dioxide in the atmosphere, reduces the ability of coral organisms to form their calcium carbonate skeletons."',
					points: 1,
					orderIndex: 4
				}
			]
		},
		{
			title: 'The History and Evolution of Writing Systems',
			content: `The development of writing represents one of humanity's most significant intellectual achievements. From its earliest beginnings to modern digital text, writing has transformed how humans communicate, preserve knowledge, and organize societies.

The earliest writing systems emerged independently in several regions around 3500-3000 BCE. Cuneiform, developed by the Sumerians in ancient Mesopotamia (modern-day Iraq), is generally considered the first writing system. Initially pictographic, it evolved into a more abstract system of wedge-shaped marks pressed into clay tablets. Around the same time, ancient Egyptians developed hieroglyphics, a system that combined logographic, syllabic, and alphabetic elements.

Chinese writing, which appeared around 1600 BCE, took a different evolutionary path. Unlike other ancient scripts that eventually disappeared, Chinese characters have maintained continuous use for over 3,000 years, making it the oldest writing system still in use today. While undergoing modifications, the basic principles remain intact.

The Phoenician alphabet, developed around 1200 BCE in the eastern Mediterranean, marked a revolutionary step. With just 22 consonant letters, it was simpler to learn than earlier systems and could represent multiple languages. This efficiency led to its widespread adoption and adaptation by various cultures, including the Greeks, who added vowels to create the first complete alphabet.

The Romans later adapted the Greek alphabet, creating Latin letters that form the basis of today's Western alphabets. Meanwhile, other writing systems continued to develop independently, such as Brahmic scripts in India, which gave rise to many South and Southeast Asian writing systems.

In the digital age, writing has undergone further transformation. Unicode, a computing standard that assigns a unique number to every character regardless of platform or language, now enables digital representation of virtually all writing systems, preserving linguistic diversity in the digital realm.`,
			difficulty: 'hard',
			topic: 'History',
			wordCount: 280,
			source: 'Academic Journal',
			questions: [
				{
					type: 'multiple-choice',
					questionText: 'When did the earliest writing systems emerge?',
					options: JSON.stringify([
						'Around 5000 BCE',
						'Around 3500-3000 BCE',
						'Around 1600 BCE',
						'Around 1200 BCE'
					]),
					correctAnswer: 'Around 3500-3000 BCE',
					explanation: 'The passage states: "The earliest writing systems emerged independently in several regions around 3500-3000 BCE."',
					points: 1,
					orderIndex: 1
				},
				{
					type: 'true-false-ng',
					questionText: 'Chinese writing has been in continuous use for over 3,000 years.',
					options: null,
					correctAnswer: 'TRUE',
					explanation: 'The passage states: "Chinese characters have maintained continuous use for over 3,000 years, making it the oldest writing system still in use today."',
					points: 1,
					orderIndex: 2
				},
				{
					type: 'true-false-ng',
					questionText: 'The Phoenician alphabet contained both consonants and vowels.',
					options: null,
					correctAnswer: 'FALSE',
					explanation: 'According to the passage, the Phoenician alphabet had "just 22 consonant letters" and it was the Greeks who "added vowels to create the first complete alphabet."',
					points: 1,
					orderIndex: 3
				},
				{
					type: 'fill-blank',
					questionText: 'The writing system developed by the Sumerians in ancient Mesopotamia is called _______.',
					options: null,
					correctAnswer: 'cuneiform',
					explanation: 'The passage states: "Cuneiform, developed by the Sumerians in ancient Mesopotamia (modern-day Iraq), is generally considered the first writing system."',
					points: 1,
					orderIndex: 4
				},
				{
					type: 'matching',
					questionText: 'Match each writing system with its correct description:',
					options: JSON.stringify({
						items: [
							'Cuneiform',
							'Hieroglyphics',
							'Phoenician alphabet',
							'Unicode'
						],
						descriptions: [
							'A system of wedge-shaped marks pressed into clay tablets',
							'A system that combined logographic, syllabic, and alphabetic elements',
							'A revolutionary system with just 22 consonant letters',
							'A computing standard that assigns a unique number to every character'
						]
					}),
					correctAnswer: JSON.stringify({
						'Cuneiform': 'A system of wedge-shaped marks pressed into clay tablets',
						'Hieroglyphics': 'A system that combined logographic, syllabic, and alphabetic elements',
						'Phoenician alphabet': 'A revolutionary system with just 22 consonant letters',
						'Unicode': 'A computing standard that assigns a unique number to every character'
					}),
					explanation: 'These matches are based on descriptions from the passage.',
					points: 4,
					orderIndex: 5
				}
			]
		},
		{
			title: 'Urban Agriculture: Growing Food in Cities',
			content: `Urban agriculture, the practice of cultivating, processing, and distributing food in or around urban areas, has gained significant attention in recent years as a sustainable approach to food production. From rooftop gardens to community plots, urban farming takes many forms and offers numerous benefits to city dwellers and the environment.

One of the primary advantages of urban agriculture is its contribution to food security. By producing food locally, cities can reduce their dependence on distant food sources, decrease transportation costs, and provide fresher produce to residents. Studies show that urban farms can be surprisingly productive—some estimates suggest that urban agriculture already supplies 15-20% of the world's food.

Environmental benefits are also substantial. Urban green spaces help mitigate the urban heat island effect, improve air quality, and increase biodiversity. Gardens and farms can also assist with stormwater management by absorbing rainfall that would otherwise run off from impervious city surfaces, potentially reducing flooding.

Community development represents another significant advantage. Urban agriculture projects often strengthen neighborhood bonds, provide educational opportunities, and create spaces for recreation and social interaction. In economically disadvantaged areas, community gardens can transform vacant lots into productive landscapes that generate both food and pride.

Despite these benefits, urban agriculture faces several challenges. Land availability and cost are significant barriers in dense urban environments. Soil contamination, common in former industrial areas, can also pose health risks if not properly addressed. Additionally, zoning regulations, water access, and securing long-term land tenure present complications for many urban farming projects.

Innovative solutions continue to emerge to address these challenges. Vertical farming, which utilizes stacked growing systems to maximize space efficiency, has expanded the possibilities for food production in space-limited environments. Hydroponic and aquaponic systems that grow plants without soil can help overcome contamination issues while conserving water.

As cities continue to grow and global food systems face increasing pressure from climate change, urban agriculture offers a promising complement to traditional rural farming. While it won't replace conventional agriculture entirely, the integration of food production into urban planning represents an important step toward more resilient, sustainable cities.`,
			difficulty: 'easy',
			topic: 'Agriculture',
			wordCount: 320,
			source: 'Scientific Magazine',
			questions: [
				{
					type: 'multiple-choice',
					questionText: 'According to the passage, approximately what percentage of the world's food is supplied by urban agriculture?',
					options: JSON.stringify([
						'5-10%',
						'15-20%',
						'25-30%',
						'35-40%'
					]),
					correctAnswer: '15-20%',
					explanation: 'The passage states: "Studies show that urban farms can be surprisingly productive—some estimates suggest that urban agriculture already supplies 15-20% of the world's food."',
					points: 1,
					orderIndex: 1
				},
				{
					type: 'true-false-ng',
					questionText: 'Urban agriculture can help reduce flooding in cities.',
					options: null,
					correctAnswer: 'TRUE',
					explanation: 'The passage states: "Gardens and farms can also assist with stormwater management by absorbing rainfall that would otherwise run off from impervious city surfaces, potentially reducing flooding."',
					points: 1,
					orderIndex: 2
				},
				{
					type: 'true-false-ng',
					questionText: 'The passage suggests that urban agriculture will eventually replace conventional rural farming.',
					options: null,
					correctAnswer: 'FALSE',
					explanation: 'The passage explicitly states: "While it won't replace conventional agriculture entirely, the integration of food production into urban planning represents an important step toward more resilient, sustainable cities."',
					points: 1,
					orderIndex: 3
				},
				{
					type: 'multiple-choice',
					questionText: 'Which of the following is NOT mentioned as a challenge facing urban agriculture?',
					options: JSON.stringify([
						'Land availability',
						'Soil contamination',
						'Pest management',
						'Zoning regulations'
					]),
					correctAnswer: 'Pest management',
					explanation: 'The passage mentions land availability, soil contamination, and zoning regulations as challenges, but does not mention pest management.',
					points: 1,
					orderIndex: 4
				},
				{
					type: 'matching',
					questionText: 'Match each urban farming approach with its correct description:',
					options: JSON.stringify({
						items: [
							'Vertical farming',
							'Hydroponic systems',
							'Community gardens',
							'Rooftop gardens'
						],
						descriptions: [
							'Utilizes stacked growing systems to maximize space efficiency',
							'Grows plants without soil to overcome contamination issues',
							'Transform vacant lots into productive landscapes',
							'One form of urban agriculture mentioned in the introduction'
						]
					}),
					correctAnswer: JSON.stringify({
						'Vertical farming': 'Utilizes stacked growing systems to maximize space efficiency',
						'Hydroponic systems': 'Grows plants without soil to overcome contamination issues',
						'Community gardens': 'Transform vacant lots into productive landscapes',
						'Rooftop gardens': 'One form of urban agriculture mentioned in the introduction'
					}),
					explanation: 'These matches are based on descriptions from the passage.',
					points: 4,
					orderIndex: 5
				}
			]
		}
	]

	for (const passageData of passages) {
		const { questions, ...passage } = passageData
		
		// 创建文章
		const createdPassage = await prisma.ieltsPassage.create({
			data: passage
		})
		
		// 为每个文章创建问题
		for (const question of questions) {
			await prisma.ieltsQuestion.create({
				data: {
					...question,
					passageId: createdPassage.id
				}
			})
		}
	}

	console.log(`✅ Created ${passages.length} IELTS passages with questions`)
}

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	const totalUsers = 5
	console.time(`👤 Created ${totalUsers} users...`)
	const noteImages = await getNoteImages()
	const userImages = await getUserImages()

	for (let index = 0; index < totalUsers; index++) {
		const userData = createUser()
		const user = await prisma.user.create({
			select: { id: true },
			data: {
				...userData,
				password: { create: createPassword(userData.username) },
				roles: { connect: { name: 'user' } },
			},
		})

		// Upload user profile image
		const userImage = userImages[index % userImages.length]
		if (userImage) {
			await prisma.userImage.create({
				data: {
					userId: user.id,
					objectKey: userImage.objectKey,
				},
			})
		}

		// Create notes with images
		const notesCount = faker.number.int({ min: 1, max: 3 })
		for (let noteIndex = 0; noteIndex < notesCount; noteIndex++) {
			const note = await prisma.note.create({
				select: { id: true },
				data: {
					title: faker.lorem.sentence(),
					content: faker.lorem.paragraphs(),
					ownerId: user.id,
				},
			})

			// Add images to note
			const noteImageCount = faker.number.int({ min: 1, max: 3 })
			for (let imageIndex = 0; imageIndex < noteImageCount; imageIndex++) {
				const imgNumber = faker.number.int({ min: 0, max: 9 })
				const noteImage = noteImages[imgNumber]
				if (noteImage) {
					await prisma.noteImage.create({
						data: {
							noteId: note.id,
							altText: noteImage.altText,
							objectKey: noteImage.objectKey,
						},
					})
				}
			}
		}
	}
	console.timeEnd(`👤 Created ${totalUsers} users...`)

	console.time(`🐨 Created admin user "kody"`)

	const kodyImages = {
		kodyUser: { objectKey: 'user/kody.png' },
		cuteKoala: {
			altText: 'an adorable koala cartoon illustration',
			objectKey: 'kody-notes/cute-koala.png',
		},
		koalaEating: {
			altText: 'a cartoon illustration of a koala in a tree eating',
			objectKey: 'kody-notes/koala-eating.png',
		},
		koalaCuddle: {
			altText: 'a cartoon illustration of koalas cuddling',
			objectKey: 'kody-notes/koala-cuddle.png',
		},
		mountain: {
			altText: 'a beautiful mountain covered in snow',
			objectKey: 'kody-notes/mountain.png',
		},
		koalaCoder: {
			altText: 'a koala coding at the computer',
			objectKey: 'kody-notes/koala-coder.png',
		},
		koalaMentor: {
			altText:
				'a koala in a friendly and helpful posture. The Koala is standing next to and teaching a woman who is coding on a computer and shows positive signs of learning and understanding what is being explained.',
			objectKey: 'kody-notes/koala-mentor.png',
		},
		koalaSoccer: {
			altText: 'a cute cartoon koala kicking a soccer ball on a soccer field ',
			objectKey: 'kody-notes/koala-soccer.png',
		},
	}

	const githubUser = await insertGitHubUser(MOCK_CODE_GITHUB)

	const kody = await prisma.user.create({
		select: { id: true },
		data: {
			email: 'kody@kcd.dev',
			username: 'kody',
			name: 'Kody',
			password: { create: createPassword('kodylovesyou') },
			connections: {
				create: {
					providerName: 'github',
					providerId: String(githubUser.profile.id),
				},
			},
			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	await prisma.userImage.create({
		data: {
			userId: kody.id,
			objectKey: kodyImages.kodyUser.objectKey,
		},
	})

	// Create Kody's notes
	const kodyNotes = [
		{
			id: 'd27a197e',
			title: 'Basic Koala Facts',
			content:
				'Koalas are found in the eucalyptus forests of eastern Australia. They have grey fur with a cream-coloured chest, and strong, clawed feet, perfect for living in the branches of trees!',
			images: [kodyImages.cuteKoala, kodyImages.koalaEating],
		},
		{
			id: '414f0c09',
			title: 'Koalas like to cuddle',
			content:
				'Cuddly critters, koalas measure about 60cm to 85cm long, and weigh about 14kg.',
			images: [kodyImages.koalaCuddle],
		},
		{
			id: '260366b1',
			title: 'Not bears',
			content:
				"Although you may have heard people call them koala 'bears', these awesome animals aren't bears at all – they are in fact marsupials. A group of mammals, most marsupials have pouches where their newborns develop.",
			images: [],
		},
		{
			id: 'bb79cf45',
			title: 'Snowboarding Adventure',
			content:
				"Today was an epic day on the slopes! Shredded fresh powder with my friends, caught some sick air, and even attempted a backflip. Can't wait for the next snowy adventure!",
			images: [kodyImages.mountain],
		},
		{
			id: '9f4308be',
			title: 'Onewheel Tricks',
			content:
				"Mastered a new trick on my Onewheel today called '180 Spin'. It's exhilarating to carve through the streets while pulling off these rad moves. Time to level up and learn more!",
			images: [],
		},
		{
			id: '306021fb',
			title: 'Coding Dilemma',
			content:
				"Stuck on a bug in my latest coding project. Need to figure out why my function isn't returning the expected output. Time to dig deep, debug, and conquer this challenge!",
			images: [kodyImages.koalaCoder],
		},
		{
			id: '16d4912a',
			title: 'Coding Mentorship',
			content:
				"Had a fantastic coding mentoring session today with Sarah. Helped her understand the concept of recursion, and she made great progress. It's incredibly fulfilling to help others improve their coding skills.",
			images: [kodyImages.koalaMentor],
		},
		{
			id: '3199199e',
			title: 'Koala Fun Facts',
			content:
				"Did you know that koalas sleep for up to 20 hours a day? It's because their diet of eucalyptus leaves doesn't provide much energy. But when I'm awake, I enjoy munching on leaves, chilling in trees, and being the cuddliest koala around!",
			images: [],
		},
		{
			id: '2030ffd3',
			title: 'Skiing Adventure',
			content:
				'Spent the day hitting the slopes on my skis. The fresh powder made for some incredible runs and breathtaking views. Skiing down the mountain at top speed is an adrenaline rush like no other!',
			images: [kodyImages.mountain],
		},
		{
			id: 'f375a804',
			title: 'Code Jam Success',
			content:
				'Participated in a coding competition today and secured the first place! The adrenaline, the challenging problems, and the satisfaction of finding optimal solutions—it was an amazing experience. Feeling proud and motivated to keep pushing my coding skills further!',
			images: [kodyImages.koalaCoder],
		},
		{
			id: '562c541b',
			title: 'Koala Conservation Efforts',
			content:
				"Joined a local conservation group to protect koalas and their habitats. Together, we're planting more eucalyptus trees, raising awareness about their endangered status, and working towards a sustainable future for these adorable creatures. Every small step counts!",
			images: [],
		},
		{
			id: 'f67ca40b',
			title: 'Game day',
			content:
				"Just got back from the most amazing game. I've been playing soccer for a long time, but I've not once scored a goal. Well, today all that changed! I finally scored my first ever goal.\n\nI'm in an indoor league, and my team's not the best, but we're pretty good and I have fun, that's all that really matters. Anyway, I found myself at the other end of the field with the ball. It was just me and the goalie. I normally just kick the ball and hope it goes in, but the ball was already rolling toward the goal. The goalie was about to get the ball, so I had to charge. I managed to get possession of the ball just before the goalie got it. I brought it around the goalie and had a perfect shot. I screamed so loud in excitement. After all these years playing, I finally scored a goal!\n\nI know it's not a lot for most folks, but it meant a lot to me. We did end up winning the game by one. It makes me feel great that I had a part to play in that.\n\nIn this team, I'm the captain. I'm constantly cheering my team on. Even after getting injured, I continued to come and watch from the side-lines. I enjoy yelling (encouragingly) at my team mates and helping them be the best they can. I'm definitely not the best player by a long stretch. But I really enjoy the game. It's a great way to get exercise and have good social interactions once a week.\n\nThat said, it can be hard to keep people coming and paying dues and stuff. If people don't show up it can be really hard to find subs. I have a list of people I can text, but sometimes I can't find anyone.\n\nBut yeah, today was awesome. I felt like more than just a player that gets in the way of the opposition, but an actual asset to the team. Really great feeling.\n\nAnyway, I'm rambling at this point and really this is just so we can have a note that's pretty long to test things out. I think it's long enough now... Cheers!",
			images: [kodyImages.koalaSoccer],
		},
	]

	for (const noteData of kodyNotes) {
		const note = await prisma.note.create({
			select: { id: true },
			data: {
				id: noteData.id,
				title: noteData.title,
				content: noteData.content,
				ownerId: kody.id,
			},
		})

		for (const image of noteData.images) {
			await prisma.noteImage.create({
				data: {
					noteId: note.id,
					altText: image.altText,
					objectKey: image.objectKey,
				},
			})
		}
	}

	console.timeEnd(`🐨 Created admin user "kody"`)
	
	// 添加雅思阅读种子数据
	await seedIeltsData()

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

// we're ok to import from the test directory in this file
/*
eslint
	no-restricted-imports: "off",
*/
