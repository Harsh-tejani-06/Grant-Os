const { validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');

// @desc    Register a new team member under an organization
// @route   POST /api/member/register
// @access  Public
const registerMember = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, email, password, organizationName } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // 2. Look up organization by name (case-insensitive)
    const organization = await Organization.findOne({
      organizationName: { $regex: new RegExp(`^${organizationName.trim()}$`, 'i') },
    });

    // 3. If not found → deny
    if (!organization) {
      return res.status(403).json({
        success: false,
        message: 'No organization found with this name. Access denied.',
        errorType: 'org_not_found',
      });
    }

    // 4. If found but not approved → wait
    if (organization.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message:
          organization.status === 'pending'
            ? 'Your organization is pending approval. Please wait for the organization to be approved before registering.'
            : 'This organization has been rejected and cannot accept new members.',
        errorType: 'org_not_approved',
        orgStatus: organization.status,
      });
    }

    // 5. Organization is approved → create member with isVerified=false and default proposal_writing task
    const member = await User.create({
      fullName,
      email,
      password,
      role: 'team_member',
      organization: organization._id,
      isVerified: false, // Needs org admin verification
      assignedTasks: ['proposal_writing'],
    });

    res.status(201).json({
      success: true,
      message:
        'Account created successfully. Waiting for your Organization Admin to verify your membership.',
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        role: member.role,
        organization: organization._id,
        organizationName: organization.organizationName,
        isVerified: false,
      },
    });
  } catch (error) {
    console.error('Member registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during member registration',
    });
  }
};

// @desc    Get all team members of the admin's organization
// @route   GET /api/member/list
// @access  Private (org_admin)
const getMembers = async (req, res) => {
  try {
    if (!req.user.organization) {
      return res.status(400).json({
        success: false,
        message: 'You do not have an organization',
      });
    }

    const members = await User.find({
      organization: req.user.organization,
      role: 'team_member',
    })
      .select('-password')
      .sort({ createdAt: -1 });

    const counts = {
      total: members.length,
      verified: members.filter((m) => m.isVerified).length,
      pending: members.filter((m) => !m.isVerified).length,
    };

    res.json({
      success: true,
      counts,
      members,
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Verify (approve) a pending team member
// @route   PUT /api/member/:id/verify
// @access  Private (org_admin)
const verifyMember = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // Ensure the member belongs to admin's organization
    if (
      !req.user.organization ||
      member.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only verify members of your own organization',
      });
    }

    if (member.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Member is already verified',
      });
    }

    member.isVerified = true;
    member.verifiedBy = req.user._id;
    member.verifiedAt = new Date();
    if (!member.assignedTasks || member.assignedTasks.length === 0) {
      member.assignedTasks = ['proposal_writing'];
    }
    await member.save();

    res.json({
      success: true,
      message: `${member.fullName} has been verified and can now access the platform`,
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        isVerified: member.isVerified,
        verifiedAt: member.verifiedAt,
        assignedTasks: member.assignedTasks,
      },
    });
  } catch (error) {
    console.error('Verify member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification',
    });
  }
};

// @desc    Reject (remove) a pending team member
// @route   DELETE /api/member/:id/reject
// @access  Private (org_admin)
const rejectMember = async (req, res) => {
  try {
    const member = await User.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // Ensure the member belongs to admin's organization
    if (
      !req.user.organization ||
      member.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only manage members of your own organization',
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: `${member.fullName} has been rejected and removed`,
    });
  } catch (error) {
    console.error('Reject member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during rejection',
    });
  }
};

// @desc    Assign tasks to a verified team member
// @route   PUT /api/member/:id/assign-task
// @access  Private (org_admin)
const assignTask = async (req, res) => {
  try {
    const { tasks } = req.body;

    const validTasks = [
      'proposal_writing',
      'budget_planning',
      'research',
      'compliance',
      'reporting',
      'grant_discovery',
    ];

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        message: 'Tasks must be an array',
      });
    }

    // Validate each task
    const invalidTasks = tasks.filter((t) => !validTasks.includes(t));
    if (invalidTasks.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid task types: ${invalidTasks.join(', ')}`,
      });
    }

    const member = await User.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found',
      });
    }

    // Ensure the member belongs to admin's organization
    if (
      !req.user.organization ||
      member.organization.toString() !== req.user.organization.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign tasks to members of your own organization',
      });
    }

    if (!member.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign tasks to an unverified member. Verify them first.',
      });
    }

    member.assignedTasks = tasks;
    await member.save();

    res.json({
      success: true,
      message: `Tasks updated for ${member.fullName}`,
      member: {
        id: member._id,
        fullName: member.fullName,
        email: member.email,
        assignedTasks: member.assignedTasks,
      },
    });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during task assignment',
    });
  }
};

module.exports = {
  registerMember,
  getMembers,
  verifyMember,
  rejectMember,
  assignTask,
};
