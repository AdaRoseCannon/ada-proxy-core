'use strict'

/**
 * Sync a folder using git & run install commands
 * @return void
 */
function deploy(item, callback) {
	var repo = git(item.deploy.folder);
	repo.sync(function (err) {
		if (err) {
			console.log (err);
			return;
		}
		if (item.deploy.run) {
			var run = exec(item.deploy.run, {
				cwd: item.deploy.folder
			});
			run.on('close', function (code) {
				if (!code) {
					console.log('Updated', item.deploy.folder, 'successfully');
					if (callback) callback();
				} else {
					console.log('Deploy step failed.');
				}
			});
		}
	});
}

module.exports = deploy;