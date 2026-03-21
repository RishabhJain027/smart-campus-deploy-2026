# PSR Campus Deployment Script

Write-Host "🚀 Starting PSR Campus Deployment..." -ForegroundColor Cyan

# 1. GitHub Setup
$currentRemote = git remote -v
if (-not $currentRemote) {
    $repoUrl = Read-Host "Enter your GitHub Repository URL (e.g., https://github.com/rishabhjain/psr-campus.git)"
    if ($repoUrl) {
        git remote add origin $repoUrl
        Write-Host "✅ Remote added: $repoUrl"
    }
}

Write-Host "📤 Pushing code to GitHub..."
git push -u origin master

# 2. Vercel Deployment
Write-Host "🌐 Initializing Vercel Deployment..."
Write-Host "Note: If you are not logged in, a browser window will open for Vercel login."
vercel login
vercel --yes --prod

Write-Host "🎉 Deployment Successful!" -ForegroundColor Green
pause
