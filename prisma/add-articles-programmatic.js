// Script to add additional IELTS articles programmatically
import { PrismaClient } from '@prisma/client'

async function addArticles() {
  console.log('🌱 Adding additional IELTS articles programmatically...')
  
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
    
    // Article 1: AI and Society
    console.log('Adding Article 1: Artificial Intelligence and Society')
    const article1 = await prisma.ieltsPassage.create({
      data: {
        id: 'article1',
        title: 'Artificial Intelligence and Society',
        content: `Artificial Intelligence (AI) has emerged as one of the most transformative technologies of the 21st century. From voice assistants and recommendation systems to autonomous vehicles and medical diagnostics, AI applications are increasingly integrated into daily life, reshaping how humans interact with machines and with each other.

At its core, AI refers to computer systems capable of performing tasks that typically require human intelligence. These include learning from experience, recognizing patterns, understanding language, and making decisions. Machine learning, a subset of AI, enables systems to improve their performance over time without explicit programming, instead learning from data.

The recent advances in AI have been driven by several factors: the exponential growth in computing power, the availability of vast amounts of data, and breakthroughs in algorithmic approaches, particularly deep learning. These developments have enabled AI to surpass human performance in certain specialized tasks, such as image recognition and specific games like chess and Go.

The economic implications of AI are profound. Automation facilitated by AI is transforming industries and labor markets. While increasing productivity and creating new types of jobs, it also threatens to displace workers in certain sectors. According to some estimates, up to 30% of current jobs could be automated by the mid-2030s, necessitating significant workforce transitions and reskilling.

Ethical considerations surrounding AI development and deployment are increasingly at the forefront of public discourse. Issues of bias in AI systems, which may perpetuate or amplify existing social inequalities, have raised concerns. Privacy implications are also significant, as AI systems often rely on processing large amounts of personal data. Additionally, questions about accountability arise when autonomous systems make decisions with significant consequences.

Looking forward, the governance of AI presents complex challenges. Policymakers and organizations worldwide are working to develop frameworks that promote innovation while mitigating risks. Despite these challenges, AI's potential to address global problems—from climate change to healthcare accessibility—makes its continued development an important priority for many societies.`,
        difficulty: 'medium',
        topic: 'Technology',
        wordCount: 350,
        source: 'Scientific Journal',
        questions: {
          create: [
            {
              id: 'q1a1',
              type: 'multiple-choice',
              questionText: 'According to the passage, which factor has NOT contributed to recent advances in AI?',
              options: JSON.stringify(["Increased computing power", "Availability of large datasets", "Improvements in cryptography", "Breakthroughs in deep learning"]),
              correctAnswer: 'Improvements in cryptography',
              explanation: 'The passage mentions "the exponential growth in computing power, the availability of vast amounts of data, and breakthroughs in algorithmic approaches, particularly deep learning" as factors driving AI advances, but does not mention cryptography.',
              points: 1,
              orderIndex: 1
            },
            {
              id: 'q2a1',
              type: 'true-false-ng',
              questionText: 'AI systems have surpassed human performance in all cognitive tasks.',
              correctAnswer: 'FALSE',
              explanation: 'The passage states that AI has "surpass[ed] human performance in certain specialized tasks" (not all tasks), giving examples of "image recognition and specific games like chess and Go."',
              points: 1,
              orderIndex: 2
            },
            {
              id: 'q3a1',
              type: 'true-false-ng',
              questionText: 'According to some estimates, up to 30% of current jobs could be automated by the mid-2030s.',
              correctAnswer: 'TRUE',
              explanation: 'The passage directly states this: "According to some estimates, up to 30% of current jobs could be automated by the mid-2030s."',
              points: 1,
              orderIndex: 3
            },
            {
              id: 'q4a1',
              type: 'fill-blank',
              questionText: 'AI has the potential to address global problems such as climate change and _______ accessibility.',
              correctAnswer: 'healthcare',
              explanation: 'The passage states in the final paragraph that AI has "potential to address global problems—from climate change to healthcare accessibility."',
              points: 1,
              orderIndex: 4
            },
            {
              id: 'q5a1',
              type: 'matching',
              questionText: 'Match each AI concept with its correct description:',
              options: JSON.stringify({
                items: ["AI", "Machine Learning", "Deep Learning", "Automation"],
                descriptions: [
                  "Computer systems that perform tasks requiring human intelligence",
                  "Systems that improve performance without explicit programming",
                  "A breakthrough algorithmic approach driving recent AI advances",
                  "A process facilitated by AI that is transforming labor markets"
                ]
              }),
              correctAnswer: JSON.stringify({
                "AI": "Computer systems that perform tasks requiring human intelligence",
                "Machine Learning": "Systems that improve performance without explicit programming",
                "Deep Learning": "A breakthrough algorithmic approach driving recent AI advances",
                "Automation": "A process facilitated by AI that is transforming labor markets"
              }),
              explanation: 'The matches are based on descriptions from the passage.',
              points: 4,
              orderIndex: 5
            }
          ]
        }
      }
    })
    
    // Article 2: Psychology of Decision Making
    console.log('Adding Article 2: The Psychology of Decision Making')
    const article2 = await prisma.ieltsPassage.create({
      data: {
        id: 'article2',
        title: 'The Psychology of Decision Making',
        content: `Human decision making is a complex cognitive process influenced by a multitude of psychological factors. Despite our self-perception as rational beings, research in cognitive psychology and behavioral economics has revealed that our decisions are often driven by unconscious biases, emotional states, and mental shortcuts rather than purely logical reasoning.

One key insight from this field is the concept of bounded rationality, proposed by Nobel laureate Herbert Simon. This theory suggests that when individuals make decisions, their rationality is limited by the information they have, cognitive constraints, and the finite amount of time available. Rather than seeking optimal solutions, people typically settle for satisfactory ones through a process Simon termed "satisficing."

Heuristics—mental shortcuts that help us make decisions quickly—play a crucial role in everyday judgment. While efficient, these shortcuts can lead to systematic errors known as cognitive biases. For instance, the availability heuristic causes people to overestimate the likelihood of events that readily come to mind, such as airplane crashes, while underestimating more common but less memorable risks like heart disease.

Emotions significantly influence decision making, sometimes overriding rational analysis. The affect heuristic, identified by psychologist Paul Slovic, demonstrates how feelings about options can guide choices more powerfully than logical evaluation of risks and benefits. This explains why individuals might avoid flying after hearing about a plane crash, even when statistics show it remains far safer than driving.

Social factors also shape our choices. Conformity pressure can lead individuals to make decisions that align with group norms rather than their personal judgment. The classic experiments by Solomon Asch revealed that people would provide obviously incorrect answers to simple questions when faced with group consensus contradicting their perceptions.

Understanding these psychological mechanisms has practical applications across fields. In healthcare, recognizing how patients process information about treatment options can improve medical decision making. In finance, acknowledging the role of emotion and bias helps explain market behavior that deviates from rational economic models. Policy makers increasingly use behavioral insights to design interventions that account for how people actually make decisions rather than how they theoretically should.

While these cognitive shortcuts and biases might seem like flaws, they evolved as adaptive mechanisms in environments where quick decisions were often more valuable than perfect ones. The challenge in modern complex societies is recognizing when our intuitive judgment serves us well and when more deliberative thinking is required.`,
        difficulty: 'hard',
        topic: 'Psychology',
        wordCount: 380,
        source: 'Academic Journal',
        questions: {
          create: [
            {
              id: 'q1a2',
              type: 'true-false-ng',
              questionText: 'Herbert Simon proposed that humans always make perfectly rational decisions.',
              correctAnswer: 'FALSE',
              explanation: 'The passage states that Simon proposed the concept of "bounded rationality," suggesting that "when individuals make decisions, their rationality is limited" and they typically "settle for satisfactory ones" rather than optimal solutions.',
              points: 1,
              orderIndex: 1
            },
            {
              id: 'q2a2',
              type: 'multiple-choice',
              questionText: 'Which of the following best describes the "availability heuristic"?',
              options: JSON.stringify([
                "A tendency to rely on expert advice when making complex decisions",
                "The phenomenon where people overestimate the likelihood of events that come easily to mind",
                "The process of seeking optimal solutions to problems",
                "A bias toward making decisions that conform to group norms"
              ]),
              correctAnswer: 'The phenomenon where people overestimate the likelihood of events that come easily to mind',
              explanation: 'The passage explains the availability heuristic as a mental shortcut that "causes people to overestimate the likelihood of events that readily come to mind, such as airplane crashes, while underestimating more common but less memorable risks like heart disease."',
              points: 1,
              orderIndex: 2
            },
            {
              id: 'q3a2',
              type: 'fill-blank',
              questionText: 'According to the passage, cognitive shortcuts and biases evolved as _______ mechanisms in environments where quick decisions were often more valuable than perfect ones.',
              correctAnswer: 'adaptive',
              explanation: 'The final paragraph states that "these cognitive shortcuts and biases might seem like flaws, they evolved as adaptive mechanisms in environments where quick decisions were often more valuable than perfect ones."',
              points: 1,
              orderIndex: 3
            },
            {
              id: 'q4a2',
              type: 'true-false-ng',
              questionText: 'Social conformity has no significant impact on individual decision making.',
              correctAnswer: 'FALSE',
              explanation: 'The passage clearly states that "Social factors also shape our choices. Conformity pressure can lead individuals to make decisions that align with group norms rather than their personal judgment."',
              points: 1,
              orderIndex: 4
            },
            {
              id: 'q5a2',
              type: 'matching',
              questionText: 'Match each concept with its correct description:',
              options: JSON.stringify({
                items: ["Bounded rationality", "Satisficing", "Affect heuristic", "Conformity pressure"],
                descriptions: [
                  "Limited decision making due to cognitive constraints and finite time",
                  "Settling for satisfactory rather than optimal solutions",
                  "Decision guidance based on feelings rather than logical evaluation",
                  "Influence that leads individuals to align with group norms"
                ]
              }),
              correctAnswer: JSON.stringify({
                "Bounded rationality": "Limited decision making due to cognitive constraints and finite time",
                "Satisficing": "Settling for satisfactory rather than optimal solutions",
                "Affect heuristic": "Decision guidance based on feelings rather than logical evaluation",
                "Conformity pressure": "Influence that leads individuals to align with group norms"
              }),
              explanation: 'The matches are based on descriptions from the passage.',
              points: 4,
              orderIndex: 5
            }
          ]
        }
      }
    })
    
    // Article 3: Biodiversity
    console.log('Adding Article 3: Biodiversity and Ecosystem Services')
    const article3 = await prisma.ieltsPassage.create({
      data: {
        id: 'article3',
        title: 'Biodiversity and Ecosystem Services',
        content: `Biodiversity—the variety of life on Earth—encompasses the diversity within species, between species, and of ecosystems. This rich tapestry of life forms provides numerous benefits to human societies through what scientists term "ecosystem services." These essential services, often taken for granted, underpin human wellbeing and economic activities worldwide.

Ecosystem services are typically categorized into four groups. Provisioning services include the material outputs from ecosystems, such as food, fresh water, timber, and medicinal resources. Regulating services maintain beneficial environmental conditions through processes like climate regulation, flood protection, water purification, and pollination. Cultural services represent non-material benefits like recreation, education, spiritual enrichment, and aesthetic experiences. Supporting services, such as nutrient cycling and soil formation, enable all other ecosystem services to function.

The economic value of these services is substantial. The pollination of crops by insects, primarily bees, contributes an estimated $235-577 billion to global food production annually. Forests store carbon worth billions of dollars in terms of climate change mitigation. Coral reefs provide coastal protection, fisheries, and tourism benefits valued at approximately $30-375 billion per year. Despite these impressive figures, many ecosystem services remain undervalued or unaccounted for in economic decision-making.

Human activities have dramatically accelerated biodiversity loss, with current extinction rates estimated to be 100-1,000 times higher than natural background rates. Habitat destruction, primarily through agriculture and urban expansion, represents the greatest threat. Climate change, pollution, overexploitation of resources, and invasive species introduction further compound the problem. The 2019 Global Assessment Report by the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services (IPBES) warned that around one million animal and plant species face extinction within decades.

This biodiversity crisis directly threatens the ecosystem services upon which humanity depends. As species disappear, ecological relationships are disrupted, potentially leading to ecosystem collapse. Research indicates that diverse ecosystems are generally more productive, stable, and resilient to environmental change than simplified ones. The loss of keystone species—those with disproportionate effects on ecosystem functioning—can trigger cascading effects throughout food webs.

Conservation efforts increasingly recognize the interconnection between biodiversity protection and human wellbeing. Approaches like ecosystem-based management integrate ecological, social, and economic objectives. Protected areas, while crucial, must be complemented by sustainable management of working landscapes and seascapes. Indigenous communities, who manage about 28% of the Earth's land surface, play a vital role in biodiversity conservation through traditional practices that have maintained ecosystem health for generations.

The path forward requires transformative change across economic, social, and political systems. Placing nature at the heart of decision-making—from governmental policies to business practices and individual choices—represents our best hope for sustaining both biodiversity and the ecosystem services essential for human prosperity.`,
        difficulty: 'easy',
        topic: 'Environment',
        wordCount: 400,
        source: 'Scientific Magazine',
        questions: {
          create: [
            {
              id: 'q1a3',
              type: 'multiple-choice',
              questionText: 'According to the passage, which of the following is NOT a category of ecosystem services?',
              options: JSON.stringify([
                "Provisioning services",
                "Regulating services",
                "Commercial services",
                "Cultural services"
              ]),
              correctAnswer: 'Commercial services',
              explanation: 'The passage mentions four categories of ecosystem services: provisioning, regulating, cultural, and supporting services. "Commercial services" is not listed as one of these categories.',
              points: 1,
              orderIndex: 1
            },
            {
              id: 'q2a3',
              type: 'true-false-ng',
              questionText: 'Current extinction rates are estimated to be 100-1,000 times higher than natural background rates.',
              correctAnswer: 'TRUE',
              explanation: 'The passage directly states this fact: "current extinction rates estimated to be 100-1,000 times higher than natural background rates."',
              points: 1,
              orderIndex: 2
            },
            {
              id: 'q3a3',
              type: 'fill-blank',
              questionText: 'Indigenous communities manage approximately _______% of the Earth\'s land surface.',
              correctAnswer: '28',
              explanation: 'The passage states: "Indigenous communities, who manage about 28% of the Earth\'s land surface, play a vital role in biodiversity conservation."',
              points: 1,
              orderIndex: 3
            },
            {
              id: 'q4a3',
              type: 'true-false-ng',
              questionText: 'Diverse ecosystems are generally less stable than simplified ones.',
              correctAnswer: 'FALSE',
              explanation: 'The passage states the opposite: "Research indicates that diverse ecosystems are generally more productive, stable, and resilient to environmental change than simplified ones."',
              points: 1,
              orderIndex: 4
            },
            {
              id: 'q5a3',
              type: 'matching',
              questionText: 'Match each type of ecosystem service with its example:',
              options: JSON.stringify({
                items: ["Provisioning services", "Regulating services", "Cultural services", "Supporting services"],
                descriptions: [
                  "Timber and medicinal resources",
                  "Climate regulation and pollination",
                  "Recreation and spiritual enrichment",
                  "Nutrient cycling and soil formation"
                ]
              }),
              correctAnswer: JSON.stringify({
                "Provisioning services": "Timber and medicinal resources",
                "Regulating services": "Climate regulation and pollination",
                "Cultural services": "Recreation and spiritual enrichment",
                "Supporting services": "Nutrient cycling and soil formation"
              }),
              explanation: 'The matches are based on examples given in the passage for each category of ecosystem service.',
              points: 4,
              orderIndex: 5
            }
          ]
        }
      }
    })

    // Article 4: Water Crisis
    console.log('Adding Article 4: Global Water Crisis')
    const article4 = await prisma.ieltsPassage.create({
      data: {
        id: 'article4',
        title: 'Global Water Crisis: Challenges and Solutions',
        content: `Water is essential for life, yet millions of people worldwide face water scarcity, poor water quality, and inadequate sanitation. The global water crisis represents one of the most significant challenges of the 21st century, with far-reaching implications for human health, economic development, and environmental sustainability.

Currently, about 2.2 billion people lack access to safely managed drinking water services, and 4.2 billion people lack safely managed sanitation services. Water scarcity affects more than 40% of the global population and is projected to worsen with climate change and population growth. By 2025, two-thirds of the world's population could be living under water-stressed conditions.

The causes of the water crisis are multifaceted. Climate change is altering precipitation patterns, increasing the frequency of droughts in some regions while causing more intense rainfall and flooding in others. Groundwater depletion has accelerated as increasing agricultural, industrial, and domestic demands exceed natural replenishment rates. Water pollution from agricultural runoff, industrial discharge, and improper waste disposal contaminates available freshwater resources. Aging infrastructure in many countries leads to significant water losses through leaking pipes and inefficient systems.

Water scarcity has profound societal impacts. In water-stressed regions, women and children often bear the burden of water collection, walking hours daily to distant sources, which limits their educational and economic opportunities. Water-related diseases, resulting from inadequate water quality and sanitation, cause approximately 485,000 diarrheal deaths each year. Water scarcity can also trigger or exacerbate conflicts in regions where resources are contested.

Addressing the global water crisis requires a multifaceted approach. Water conservation and efficiency improvements in agriculture—which accounts for about 70% of global freshwater withdrawals—offer significant potential through technologies like drip irrigation and practices such as deficit irrigation. In urban areas, fixing leaking infrastructure, implementing water-efficient fixtures, and promoting behavioral changes can substantially reduce consumption.

Water reuse and recycling systems can effectively expand available water supplies. Advanced wastewater treatment enables the safe reuse of water for non-potable purposes like landscape irrigation, industrial processes, and even indirect potable use after extensive treatment and environmental buffering. Desalination technology, while energy-intensive, provides a climate-independent freshwater source for coastal regions.

Improved water governance is essential for managing this precious resource sustainably. Integrated water resources management promotes coordinated development and management of water, land, and related resources. Water pricing mechanisms that reflect the true cost of water provision while ensuring affordability for basic needs can encourage conservation. Community-based management approaches have proven effective in many regions, empowering local stakeholders to develop and maintain water systems.

International cooperation is crucial, particularly for shared water resources. Approximately 286 transboundary river basins and 592 transboundary aquifers cross national boundaries, requiring collaborative governance frameworks. Sustainable Development Goal 6 (SDG 6) provides a global framework for ensuring availability and sustainable management of water and sanitation for all by 2030, though progress toward this goal remains insufficient.

The global water crisis presents complex challenges, but with appropriate technologies, policies, and collaborative approaches, many of these challenges can be overcome, ensuring water security for current and future generations.`,
        difficulty: 'medium',
        topic: 'Environment',
        wordCount: 450,
        source: 'Research Report',
        questions: {
          create: [
            {
              id: 'q1a4',
              type: 'multiple-choice',
              questionText: 'According to the passage, approximately how many people lack access to safely managed drinking water services?',
              options: JSON.stringify([
                "1.1 billion",
                "2.2 billion",
                "3.3 billion",
                "4.2 billion"
              ]),
              correctAnswer: '2.2 billion',
              explanation: 'The passage states: "Currently, about 2.2 billion people lack access to safely managed drinking water services."',
              points: 1,
              orderIndex: 1
            },
            {
              id: 'q2a4',
              type: 'true-false-ng',
              questionText: 'By 2025, half of the world\'s population could be living under water-stressed conditions.',
              correctAnswer: 'FALSE',
              explanation: 'The passage states: "By 2025, two-thirds of the world\'s population could be living under water-stressed conditions," not half.',
              points: 1,
              orderIndex: 2
            },
            {
              id: 'q3a4',
              type: 'fill-blank',
              questionText: 'Agriculture accounts for approximately _______% of global freshwater withdrawals.',
              correctAnswer: '70',
              explanation: 'The passage states: "Water conservation and efficiency improvements in agriculture—which accounts for about 70% of global freshwater withdrawals."',
              points: 1,
              orderIndex: 3
            },
            {
              id: 'q4a4',
              type: 'true-false-ng',
              questionText: 'Water-related diseases cause approximately 485,000 diarrheal deaths each year.',
              correctAnswer: 'TRUE',
              explanation: 'The passage directly states: "Water-related diseases, resulting from inadequate water quality and sanitation, cause approximately 485,000 diarrheal deaths each year."',
              points: 1,
              orderIndex: 4
            },
            {
              id: 'q5a4',
              type: 'matching',
              questionText: 'Match each water management approach with its description:',
              options: JSON.stringify({
                items: ["Water conservation in agriculture", "Water reuse systems", "Desalination", "Integrated water resources management"],
                descriptions: [
                  "Using technologies like drip irrigation to reduce consumption",
                  "Treating wastewater for non-potable purposes",
                  "Converting seawater into freshwater",
                  "Coordinated development of water, land, and related resources"
                ]
              }),
              correctAnswer: JSON.stringify({
                "Water conservation in agriculture": "Using technologies like drip irrigation to reduce consumption",
                "Water reuse systems": "Treating wastewater for non-potable purposes",
                "Desalination": "Converting seawater into freshwater",
                "Integrated water resources management": "Coordinated development of water, land, and related resources"
              }),
              explanation: 'The matches are based on descriptions from the passage.',
              points: 4,
              orderIndex: 5
            }
          ]
        }
      }
    })

    // Article 5: Sleep Science
    console.log('Adding Article 5: The Science of Sleep')
    const article5 = await prisma.ieltsPassage.create({
      data: {
        id: 'article5',
        title: 'The Science of Sleep: Understanding Rest and Recovery',
        content: `Sleep is a fundamental biological process essential for human health and functioning. Despite the fact that we spend approximately one-third of our lives asleep, the scientific understanding of sleep is relatively recent. Over the past century, research has revealed sleep's complex nature and its critical role in physical health, cognitive function, and emotional wellbeing.

Sleep architecture follows a predictable pattern of alternating REM (rapid eye movement) and non-REM phases. Non-REM sleep consists of three stages, progressing from light sleep (stages 1-2) to deep sleep (stage 3, also called slow-wave sleep). During REM sleep, brain activity increases to levels similar to wakefulness, accompanied by rapid eye movements and muscle paralysis. A typical night involves 4-6 sleep cycles, each lasting about 90 minutes.

The regulation of sleep involves two primary mechanisms. The circadian rhythm—our internal 24-hour clock—synchronizes sleep-wake patterns with environmental light-dark cycles. This system is controlled by the suprachiasmatic nucleus in the hypothalamus, which receives light information from the retina and regulates melatonin secretion from the pineal gland. The sleep homeostatic process (often called sleep pressure) builds during wakefulness and dissipates during sleep, ensuring adequate rest.

During sleep, the brain and body undergo essential maintenance and restoration processes. Memory consolidation occurs primarily during slow-wave and REM sleep, with different sleep stages preferentially processing different types of memories. The glymphatic system—the brain's waste clearance mechanism—becomes 10 times more active during sleep, removing metabolic waste products including beta-amyloid, a protein associated with Alzheimer's disease. Growth hormone secretion peaks during deep sleep, facilitating tissue repair and growth.

Chronic sleep deprivation and disruption have far-reaching consequences. Insufficient sleep impairs attention, learning, and problem-solving while increasing reaction time—effects comparable to alcohol intoxication. The immune system depends on adequate sleep; even one night of poor sleep reduces natural killer cell activity by up to 70%. Metabolically, sleep restriction alters glucose metabolism and hormones regulating appetite, contributing to increased obesity and diabetes risk. Cardiovascular health suffers as inadequate sleep raises blood pressure and inflammatory markers.

Modern society presents numerous challenges to healthy sleep. Artificial lighting and electronic devices emit blue light that suppresses melatonin production and delays sleep onset. Irregular schedules, shift work, and social commitments often conflict with natural sleep timing. Stress, anxiety, and stimulant consumption further disrupt sleep patterns. Sleep disorders like insomnia, sleep apnea, and restless legs syndrome affect approximately 50-70 million Americans.

Developing good sleep hygiene represents the first-line approach to improving sleep quality. Maintaining consistent sleep-wake times, creating a dark, quiet, and cool sleeping environment, limiting evening screen exposure, and avoiding caffeine and alcohol near bedtime can significantly enhance sleep. Cognitive behavioral therapy for insomnia (CBT-I) has proven more effective than medication for chronic insomnia with fewer side effects. For specific sleep disorders, targeted interventions such as continuous positive airway pressure (CPAP) for sleep apnea can be life-changing.

As scientific understanding of sleep continues to advance, the fundamental message is increasingly clear: sleep is not a luxury or a sign of laziness but a biological necessity. Prioritizing sleep represents one of the most significant steps individuals can take to protect their physical health, cognitive abilities, and emotional resilience.`,
        difficulty: 'hard',
        topic: 'Health',
        wordCount: 480,
        source: 'Medical Journal',
        questions: {
          create: [
            {
              id: 'q1a5',
              type: 'multiple-choice',
              questionText: 'During which sleep stage does the brain show activity levels similar to wakefulness?',
              options: JSON.stringify([
                "Stage 1 non-REM sleep",
                "Stage 2 non-REM sleep",
                "Stage 3 non-REM sleep",
                "REM sleep"
              ]),
              correctAnswer: 'REM sleep',
              explanation: 'The passage states: "During REM sleep, brain activity increases to levels similar to wakefulness, accompanied by rapid eye movements and muscle paralysis."',
              points: 1,
              orderIndex: 1
            },
            {
              id: 'q2a5',
              type: 'true-false-ng',
              questionText: 'A typical night of sleep involves 2-3 sleep cycles.',
              correctAnswer: 'FALSE',
              explanation: 'According to the passage: "A typical night involves 4-6 sleep cycles, each lasting about 90 minutes."',
              points: 1,
              orderIndex: 2
            },
            {
              id: 'q3a5',
              type: 'multiple-choice',
              questionText: 'Which of the following is described as the brain\'s waste clearance mechanism?',
              options: JSON.stringify([
                "The circadian rhythm",
                "The suprachiasmatic nucleus",
                "The glymphatic system",
                "The homeostatic process"
              ]),
              correctAnswer: 'The glymphatic system',
              explanation: 'The passage describes "The glymphatic system—the brain\'s waste clearance mechanism—becomes 10 times more active during sleep."',
              points: 1,
              orderIndex: 3
            },
            {
              id: 'q4a5',
              type: 'fill-blank',
              questionText: 'One night of poor sleep can reduce natural killer cell activity by up to _______%.', 
              correctAnswer: '70',
              explanation: 'The passage states: "even one night of poor sleep reduces natural killer cell activity by up to 70%."',
              points: 1,
              orderIndex: 4
            },
            {
              id: 'q5a5',
              type: 'matching',
              questionText: 'Match each sleep-related term with its correct description:',
              options: JSON.stringify({
                items: ["Circadian rhythm", "Sleep homeostatic process", "REM sleep", "CBT-I"],
                descriptions: [
                  "Internal 24-hour clock that synchronizes sleep-wake patterns",
                  "Builds during wakefulness and dissipates during sleep",
                  "Characterized by rapid eye movements and muscle paralysis",
                  "More effective than medication for chronic insomnia"
                ]
              }),
              correctAnswer: JSON.stringify({
                "Circadian rhythm": "Internal 24-hour clock that synchronizes sleep-wake patterns",
                "Sleep homeostatic process": "Builds during wakefulness and dissipates during sleep",
                "REM sleep": "Characterized by rapid eye movements and muscle paralysis",
                "CBT-I": "More effective than medication for chronic insomnia"
              }),
              explanation: 'The matches are based on descriptions from the passage.',
              points: 4,
              orderIndex: 5
            }
          ]
        }
      }
    })
    
    console.log('✅ Successfully added all 5 articles with their questions!')
  } catch (error) {
    console.error('Error adding articles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addArticles() 