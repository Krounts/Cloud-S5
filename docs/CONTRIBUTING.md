# Contributing Guidelines

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a new branch for your feature: `git checkout -b feat/your-feature`
4. Make your changes
5. Commit with clear messages: `git commit -m "feat: add new feature"`
6. Push to your fork: `git push origin feat/your-feature`
7. Create a Pull Request

## Code Standards

### JavaScript/TypeScript
- Use ESLint configuration
- Format code with Prettier
- Use meaningful variable names
- Add JSDoc comments for public functions

### Git Workflow
- Work on feature branches
- Keep commits small and focused
- Write descriptive commit messages
- Keep PR scope limited to one feature

### Pull Request Process
1. Ensure all tests pass: `yarn test`
2. Ensure linting passes: `yarn lint`
3. Update documentation if needed
4. Link related issues
5. Request review from team members

## Commit Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting, etc)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Build, dependencies, etc

**Example:**
```
feat(auth): add password reset functionality

Implement password reset flow with email verification.
Resolves #123

BREAKING CHANGE: auth endpoint response format changed
```

## Testing Requirements

- Write tests for new features
- Ensure existing tests pass
- Target >80% code coverage
- Test both happy path and error cases

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test -- --coverage

# Run specific test file
yarn test auth.test.js
```

## Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No hardcoded values or secrets
- [ ] Performance impact considered
- [ ] Backward compatibility maintained
- [ ] Error handling is appropriate

## Reporting Issues

Include the following when reporting bugs:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment info (Node version, OS, etc)
- Relevant error messages/logs

## Questions or Help?

Feel free to open an issue or contact the team leads:
- [Team Lead Name] - backend
- [Team Lead Name] - frontend
- [Team Lead Name] - mobile
