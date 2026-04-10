-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Hôte : localhost:8889
-- Généré le : mar. 24 mars 2026 à 04:04
-- Version du serveur : 8.0.44
-- Version de PHP : 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `myinvoice`
--

-- --------------------------------------------------------

--
-- Structure de la table `clients`
--

CREATE TABLE `clients` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `siret` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postalCode` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vatNumber` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lastCompletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `clients`
--

INSERT INTO `clients` (`id`, `name`, `contactName`, `siret`, `email`, `phone`, `address`, `postalCode`, `city`, `country`, `vatNumber`, `lastCompletedAt`, `createdAt`, `updatedAt`) VALUES
('07ac6bad-f3ca-40dc-b258-d33fdde0384e', 'ahobaut', NULL, NULL, 'ahobautfrederick@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-22 12:21:39', '2026-03-22 12:21:39'),
('23a8e14f-3b30-4a7c-a598-8061626855c4', 'Ibrahima baby', 'Ibrahima baby', '94241997900011', 'ibrahimababy0@gmail.com', '0659791971', '276 RUE DE BELLEVILLE', '75020', 'Paris', 'France', 'FR76942419979', '2026-03-22 11:01:44', '2026-03-22 11:56:02', '2026-03-22 12:01:44');

-- --------------------------------------------------------

--
-- Structure de la table `client_invites`
--

CREATE TABLE `client_invites` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `client_invites`
--

INSERT INTO `client_invites` (`id`, `tokenHash`, `clientId`, `expiresAt`, `usedAt`, `createdAt`, `updatedAt`) VALUES
('5ac18c84-4c69-489e-a509-7ed83692ca5e', 'fbeb0174efefaa060cf608c98b32f14d2196c7bb4ed07b5ac9775c94660dc48d', '07ac6bad-f3ca-40dc-b258-d33fdde0384e', '2026-04-05 10:21:39', NULL, '2026-03-22 12:21:39', '2026-03-22 12:21:39'),
('babcc1dc-79b5-431a-80a8-bb54ac9f4925', '382635703fccc9da0f6f1cc8003c3d9dab2db5fbe12a8fbbb76f4bb9790ea558', '23a8e14f-3b30-4a7c-a598-8061626855c4', '2026-04-05 09:56:03', '2026-03-22 12:01:44', '2026-03-22 11:56:02', '2026-03-22 12:01:44');

-- --------------------------------------------------------

--
-- Structure de la table `invoice_counters`
--

CREATE TABLE `invoice_counters` (
  `counterDate` date NOT NULL,
  `docType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seq` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `invoice_counters`
--

INSERT INTO `invoice_counters` (`counterDate`, `docType`, `seq`) VALUES
('2026-03-20', 'invoice', 17);

-- --------------------------------------------------------

--
-- Structure de la table `invoice_drafts`
--

CREATE TABLE `invoice_drafts` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoiceNumber` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clientName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `clientEmail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` json NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `invoice_shares`
--

CREATE TABLE `invoice_shares` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `invoiceDraftId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `owner_profile`
--

CREATE TABLE `owner_profile` (
  `id` tinyint NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `legalForm` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `siret` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vatNumber` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `postalCode` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `legalMention` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` varchar(2000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `password_resets`
--

CREATE TABLE `password_resets` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenHash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `usedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `password_resets`
--

INSERT INTO `password_resets` (`id`, `userId`, `tokenHash`, `expiresAt`, `usedAt`, `createdAt`) VALUES
('6b66ca3c-0f27-455f-a586-3f670dfe6fc8', '0653e307-2d1a-4cea-bea5-23a7794cd4c9', '64ac8215e423489530c47307e69c08577134e8ae681486321bad7337b67f18b6', '2026-03-20 21:30:59', '2026-03-20 22:01:13', '2026-03-20 22:00:59'),
('e2bc7b9e-3a2a-47aa-80f9-30d1ca9dd9f5', '0653e307-2d1a-4cea-bea5-23a7794cd4c9', '7a7b5f2ff9a43be909cc898e15f1042fcd2443f6ad9cb0c3c93c48f49984b71f', '2026-03-20 21:36:27', '2026-03-20 22:06:58', '2026-03-20 22:06:26');

-- --------------------------------------------------------

--
-- Structure de la table `service_items`
--

CREATE TABLE `service_items` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `unit` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unit',
  `unitPriceCents` int NOT NULL DEFAULT '0',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `service_items`
--

INSERT INTO `service_items` (`id`, `name`, `description`, `unit`, `unitPriceCents`, `isActive`, `createdAt`, `updatedAt`) VALUES
('067811b6-cbb7-4791-b16e-57fb6a6e1a78', 'Développement de services backend sur mesure', NULL, 'unit', 7000, 1, '2026-03-21 19:50:38', '2026-03-21 19:50:38'),
('1edeeebb-29fa-4819-8bbe-567d1b763e0b', 'Intégration responsive (mobile, tablette, desktop)', NULL, 'unit', 3000, 1, '2026-03-21 19:49:56', '2026-03-21 19:49:56'),
('9e6922dc-2305-4e0b-b632-b9ebc6d3b5f3', 'Optimisation SEO technique', NULL, 'unit', 3000, 1, '2026-03-21 19:48:17', '2026-03-21 19:48:17'),
('9efe83a5-a802-47e9-aec5-0886cd5f6766', 'Corrections de bugs', NULL, 'unit', 2000, 1, '2026-03-21 19:49:02', '2026-03-21 19:49:02'),
('a04c9780-3fc4-4e8f-9931-daa537c3b93b', 'Amélioration de l’expérience utilisateur (UX)', NULL, 'unit', 9230, 1, '2026-03-21 19:49:33', '2026-03-21 19:49:33'),
('a77ddb1c-b13f-4433-abcd-97a417938099', 'Développement d’applications web sur mesure', NULL, 'unit', 5000, 1, '2026-03-21 19:47:57', '2026-03-21 19:47:57'),
('a8ae95e8-36a2-413f-912a-da378df518f4', 'Intégration backend pour envoi automatique (notifications, formulaires, etc.)', NULL, 'unit', 1500, 1, '2026-03-21 19:53:00', '2026-03-21 19:53:00'),
('da9631db-9f80-4464-8aea-2e55b765069f', 'Conception et développement de sites internet', NULL, 'unit', 5000, 1, '2026-03-21 19:47:24', '2026-03-21 19:47:24'),
('e079ef5e-cc4b-49d1-95c3-25406454e0bf', 'Conception de bases de données', NULL, 'unit', 5500, 1, '2026-03-21 19:51:11', '2026-03-21 19:51:11'),
('f78eb733-1287-4081-8e11-8551051db9bf', 'Optimisation des performances', NULL, 'unit', 3000, 1, '2026-03-21 19:48:37', '2026-03-21 19:48:37');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `passwordHash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `email`, `passwordHash`, `isActive`, `createdAt`, `updatedAt`) VALUES
('0653e307-2d1a-4cea-bea5-23a7794cd4c9', 'ahobautfrederick@gmail.com', '$2b$12$ZXChdd/g/YdsYB1vxhOSWOkHPZ0.r67DjPdyeT6AUuRm2vmykTiGK', 1, '2026-03-20 21:30:44', '2026-03-20 22:06:58'),
('7dea082e-47ca-43bc-8475-38fdeeb8a81f', 'admin@stack.local', '$2b$12$j2Cp9M0OeIu8nwXH5dxgpOv0dnHc5Drwsc9U4M4.zV2M4ZaMhqn5W', 1, '2026-03-20 22:51:26', '2026-03-20 22:51:26');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_clients_name` (`name`),
  ADD KEY `ix_clients_updatedAt` (`updatedAt`);

--
-- Index pour la table `client_invites`
--
ALTER TABLE `client_invites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_client_invites_tokenHash` (`tokenHash`),
  ADD KEY `ix_client_invites_clientId` (`clientId`),
  ADD KEY `ix_client_invites_expiresAt` (`expiresAt`);

--
-- Index pour la table `invoice_counters`
--
ALTER TABLE `invoice_counters`
  ADD PRIMARY KEY (`counterDate`,`docType`);

--
-- Index pour la table `invoice_drafts`
--
ALTER TABLE `invoice_drafts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_invoice_drafts_invoiceNumber` (`invoiceNumber`),
  ADD KEY `ix_invoice_drafts_updatedAt` (`updatedAt`);

--
-- Index pour la table `invoice_shares`
--
ALTER TABLE `invoice_shares`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_invoice_shares_tokenHash` (`tokenHash`),
  ADD KEY `ix_invoice_shares_invoiceDraftId` (`invoiceDraftId`),
  ADD KEY `ix_invoice_shares_expiresAt` (`expiresAt`);

--
-- Index pour la table `owner_profile`
--
ALTER TABLE `owner_profile`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `password_resets`
--
ALTER TABLE `password_resets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_password_resets_tokenHash` (`tokenHash`),
  ADD KEY `ix_password_resets_userId` (`userId`),
  ADD KEY `ix_password_resets_expiresAt` (`expiresAt`);

--
-- Index pour la table `service_items`
--
ALTER TABLE `service_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_service_items_name` (`name`),
  ADD KEY `ix_service_items_isActive` (`isActive`),
  ADD KEY `ix_service_items_updatedAt` (`updatedAt`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_users_email` (`email`);

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `client_invites`
--
ALTER TABLE `client_invites`
  ADD CONSTRAINT `fk_client_invites_clientId` FOREIGN KEY (`clientId`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `invoice_shares`
--
ALTER TABLE `invoice_shares`
  ADD CONSTRAINT `fk_invoice_shares_invoiceDraftId` FOREIGN KEY (`invoiceDraftId`) REFERENCES `invoice_drafts` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `password_resets`
--
ALTER TABLE `password_resets`
  ADD CONSTRAINT `fk_password_resets_userId` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
