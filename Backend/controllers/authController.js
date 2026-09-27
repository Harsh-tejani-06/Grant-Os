const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Organization = require('../models/Organization');
const FundingAgency = require('../models/FundingAgency');

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const signup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Only allow org_admin, team_member, and funding_agency via public signup
    const allowedRoles = ['org_admin', 'team_member', 'funding_agency'];
    const userRole = allowedRoles.includes(role) ? role : 'org_admin';

    const user = await User.create({
      fullName,
      email,
      password,
      role: userRole,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        organization: user.organization,
        fundingAgency: user.fundingAgency,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    const token = generateToken(user._id);

    // Build response with org status if applicable
    let orgStatus = null;
    if (user.organization) {
      const org = await Organization.findById(user.organization);
      if (org) {
        orgStatus = {
          status: org.status,
          submittedAt: org.submittedAt,
          rejectionReason: org.rejectionReason || null,
          organizationName: org.organizationName,
        };
      }
    }

    // Build response with agency status if applicable
    let agencyStatus = null;
    if (user.fundingAgency) {
      const agency = await FundingAgency.findById(user.fundingAgency);
      if (agency) {
        agencyStatus = {
          status: agency.status,
          submittedAt: agency.submittedAt,
          rejectionReason: agency.rejectionReason || null,
          agencyName: agency.agencyName,
        };
      }
    }

    // Build member status for team_member role
    let memberStatus = null;
    if (user.role === 'team_member') {
      memberStatus = {
        isVerified: user.isVerified,
        assignedTasks: user.assignedTasks || [],
      };
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle || (user.fullName?.toLowerCase().includes('principal investigator') ? 'Principal Investigator' : ''),
        organization: user.organization,
        fundingAgency: user.fundingAgency,
        isVerified: user.isVerified,
        assignedTasks: user.assignedTasks || [],
      },
      orgStatus,
      agencyStatus,
      memberStatus,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('organization')
      .populate('fundingAgency');

    let orgStatus = null;
    if (user.organization) {
      orgStatus = {
        status: user.organization.status,
        submittedAt: user.organization.submittedAt,
        rejectionReason: user.organization.rejectionReason || null,
        organizationName: user.organization.organizationName,
      };
    }

    let agencyStatus = null;
    if (user.fundingAgency) {
      agencyStatus = {
        status: user.fundingAgency.status,
        submittedAt: user.fundingAgency.submittedAt,
        rejectionReason: user.fundingAgency.rejectionReason || null,
        agencyName: user.fundingAgency.agencyName,
      };
    }

    // Build member status for team_member role
    let memberStatus = null;
    if (user.role === 'team_member') {
      memberStatus = {
        isVerified: user.isVerified,
        assignedTasks: user.assignedTasks || [],
      };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle || (user.fullName?.toLowerCase().includes('principal investigator') ? 'Principal Investigator' : ''),
        organization: user.organization?._id || null,
        fundingAgency: user.fundingAgency?._id || null,
        isVerified: user.isVerified,
        assignedTasks: user.assignedTasks || [],
      },
      orgStatus,
      agencyStatus,
      memberStatus,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = { signup, login, getMe };