require('dotenv').config();
const mongoose = require('mongoose');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  await db.collection('grantprograms').updateOne(
    { title: 'AI-Driven Engineering Innovation Grant 2026' },
    { $set: { 'eligibility.eligibleStates': ['Gujarat', 'Maharashtra', 'Karnataka'] } }
  );

  const existing = await db.collection('grantprograms').findOne({
    title: 'Gujarat Clean Energy & Microgrid Research Initiative 2026',
  });

  if (!existing) {
    await db.collection('grantprograms').insertOne({
      title: 'Gujarat Clean Energy & Microgrid Research Initiative 2026',
      shortTitle: 'GCEMRI-2026',
      category: 'Environmental Sciences',
      fundingType: 'Project Grant',
      description: 'State research initiative focused on microgrid resilience, renewable distributed energy, and clean power solutions tailored for rural and semi-urban clusters across Gujarat.',
      budget: '₹45 Lakh',
      budgetAmount: 4500000,
      startDate: new Date('2026-03-01'),
      deadline: new Date('2026-12-31'),
      projectDurationMonths: 24,
      status: 'Active',
      eligibility: {
        applicantTypes: ['university', 'college', 'research_institution', 'startup'],
        geographicScope: 'State',
        eligibleStates: ['Gujarat'],
        minOrganizationAge: 2,
      },
      eligibilityRulesText: 'Open to registered academic institutes, engineering colleges, and research foundations located within the state of Gujarat.',
      researchAreas: ['Renewable Energy', 'Microgrids', 'Solar & Wind'],
      fundingAgency: new mongoose.Types.ObjectId('6a79fbadb660c564e924077e'), // Tejani Group (Surat, Gujarat)
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Inserted Gujarat Clean Energy program');
  } else {
    console.log('Already exists');
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
