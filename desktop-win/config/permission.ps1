# Write-Output $args[0]
$NewAcl = Get-Acl -Path $args[0]
Out-File -FilePath $args[1] -InputObject "Setting folder permission: Reading ACL..." -Encoding ASCII -append
Out-File -FilePath $args[1] -InputObject $NewAcl -Encoding ASCII -append
Out-File -FilePath $args[1] -InputObject $NewAcl.Access -Encoding ASCII -append
# Set properties
$identity = "Users"
$fileSystemRights = "FullControl"
$inheritanceFlags = "ContainerInherit, ObjectInherit"
$propagationFlags = "None"
$type = "Allow"
# Create new rule
$fileSystemAccessRuleArgumentList = $identity, $fileSystemRights, $inheritanceFlags, $propagationFlags, $type
$fileSystemAccessRule = New-Object -TypeName System.Security.AccessControl.FileSystemAccessRule -ArgumentList $fileSystemAccessRuleArgumentList
# Apply new rule
$NewAcl.SetAccessRule($fileSystemAccessRule)
Set-Acl -Path $args[0] -AclObject $NewAcl
Out-File -FilePath $args[1] -InputObject "After setting ACL:" -Encoding ASCII -append
Out-File -FilePath $args[1] -InputObject $NewAcl -Encoding ASCII -append
Out-File -FilePath $args[1] -InputObject $NewAcl.Access -Encoding ASCII -append
# Read-Host "Click enter to proceed..."
