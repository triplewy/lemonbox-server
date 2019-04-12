#!/bin/bash
git pull
cd /home/ubuntu/lemonbox-server/ec2-mysql
npm i
cd ..
sudo systemctl restart lemonbox
