#!/bin/bash
cd /home/ubuntu/lemonbox-server
git pull
cd /home/ubuntu/lemonbox-server/ec2-mysql
npm i
cd ..
sudo systemctl restart lemonbox
